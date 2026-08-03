/**
 * Post Routes
 * GET    /api/posts/feed            — following feed (paginated)
 * GET    /api/posts/explore         — explore feed (paginated)
 * GET    /api/posts/:id             — single post
 * POST   /api/posts                 — create post (multipart)
 * PUT    /api/posts/:id             — edit post
 * DELETE /api/posts/:id             — delete post
 * POST   /api/posts/:id/like        — toggle like
 * POST   /api/posts/:id/comments    — add comment
 * DELETE /api/posts/:id/comments/:cid — delete comment
 * POST   /api/posts/:id/save        — save/unsave post
 */

const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { uploadPost, uploadToCloudinary } = require('../config/cloudinary');
const { createNotification } = require('../services/notificationService');

/**
 * GET /api/posts/feed?page=1&limit=10
 * Returns posts from users that the authenticated user follows
 */
router.get('/feed', requireAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, mediaType } = req.query;
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('following').lean();
    if (!me) return res.status(404).json({ error: 'User not found' });

    const skip = (Number(page) - 1) * Number(limit);
    const authorIds = [...me.following, me._id]; // include own posts

    let query = { author: { $in: authorIds } };
    if (mediaType) query.mediaType = mediaType;

    const posts = await Post.find(query)
      .populate('author', 'username displayName avatar isCreator')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Attach user-specific like/save status
    const enriched = posts.map(p => ({
      ...p,
      isLiked: p.likes.some(uid => uid.toString() === me._id.toString()),
      isSaved: p.saves?.some(uid => uid.toString() === me._id.toString()),
    }));

    const total = await Post.countDocuments(query);
    res.json({ posts: enriched, total, page: Number(page), hasMore: skip + enriched.length < total });
  } catch (err) { next(err); }
});

/**
 * GET /api/posts/explore?category=&search=&page=1
 * Explore all posts, optionally filtered by category or search
 */
router.get('/explore', optionalAuth, async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    let matchQuery = {};
    if (category) matchQuery.category = category;
    if (search) matchQuery.$text = { $search: search };

    let userSkills = [];
    if (req.firebaseUser && !search && !category) {
      const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('skillsToLearn').lean();
      if (me?.skillsToLearn?.length > 0) {
        userSkills = me.skillsToLearn;
      }
    }

    let pipeline = [{ $match: matchQuery }];

    // If we have user skills, calculate a recommendation score based on tag overlap
    if (userSkills.length > 0) {
      pipeline.push({
        $addFields: {
          recommendationScore: {
            $size: {
              $setIntersection: [{ $ifNull: ["$tags", []] }, userSkills]
            }
          }
        }
      });
      pipeline.push({ $sort: { recommendationScore: -1, createdAt: -1 } });
    } else {
      pipeline.push({ $sort: search ? { score: { $meta: 'textScore' } } : { createdAt: -1 } });
    }

    pipeline.push({ $skip: skip }, { $limit: Number(limit) });

    // Populate author
    pipeline.push({
      $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'author' }
    });
    pipeline.push({ $unwind: '$author' });
    pipeline.push({
      $addFields: {
        'author.username': '$author.username',
        'author.displayName': '$author.displayName',
        'author.avatar': '$author.avatar',
        'author.isCreator': '$author.isCreator',
      }
    });

    const [posts, total] = await Promise.all([
      Post.aggregate(pipeline),
      Post.countDocuments(matchQuery),
    ]);

    res.json({ posts, total, page: Number(page), hasMore: skip + posts.length < total });
  } catch (err) { next(err); }
});

/**
 * GET /api/posts/:id — single post with full comments
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('author', 'username displayName avatar isCreator bio')
      .populate('comments.user', 'username displayName avatar')
      .lean();

    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) { next(err); }
});

/**
 * POST /api/posts — create a new post
 */
router.post('/', requireAuth, uploadPost.single('media'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Media file is required' });

    const author = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id').lean();
    if (!author) return res.status(404).json({ error: 'User not found' });

    const { title, description, category, tags, skillLevel } = req.body;

    // Detect if video
    const isVideo = req.file.mimetype?.startsWith('video/');

    // Upload buffer to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.mimetype, {
      folder: 'skillshare/posts',
      resource_type: isVideo ? 'video' : 'image',
      transformation: isVideo
        ? [{ quality: 'auto' }]
        : [{ width: 1080, crop: 'limit' }, { quality: 'auto' }],
    });

    const post = await Post.create({
      author: author._id,
      title,
      description: description || '',
      mediaUrl: uploadResult.secure_url,
      mediaType: isVideo ? 'video' : 'image',
      thumbnailUrl: isVideo
        ? uploadResult.secure_url.replace('/upload/', '/upload/so_0,f_jpg/')
        : '',
      category,
      tags: tags ? JSON.parse(tags) : [],
      skillLevel: skillLevel || 'Beginner',
    });

    await post.populate('author', 'username displayName avatar isCreator');
    res.status(201).json(post);
  } catch (err) {
    console.error('❌ POST /api/posts error:', err.message, err.http_code || '');
    next(err);
  }
});


/**
 * PUT /api/posts/:id — edit a post (owner only)
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id').lean();
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!post.author.equals(me._id)) return res.status(403).json({ error: 'Not authorized' });

    const { title, description, category, tags, skillLevel } = req.body;
    if (title) post.title = title;
    if (description !== undefined) post.description = description;
    if (category) post.category = category;
    if (tags) post.tags = JSON.parse(tags);
    if (skillLevel) post.skillLevel = skillLevel;

    await post.save();
    res.json(post);
  } catch (err) { next(err); }
});

/**
 * DELETE /api/posts/:id — delete post (owner only)
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id').lean();
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!post.author.equals(me._id)) return res.status(403).json({ error: 'Not authorized' });

    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) { next(err); }
});

/**
 * POST /api/posts/:id/like — toggle like on a post
 */
router.post('/:id/like', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id displayName').lean();
    const post = await Post.findById(req.params.id).populate('author', '_id');

    if (!post) return res.status(404).json({ error: 'Post not found' });

    const alreadyLiked = post.likes.some(uid => uid.equals(me._id));

    if (alreadyLiked) {
      post.likes.pull(me._id);
    } else {
      post.likes.push(me._id);
      // Notify author (if not self)
      if (!post.author._id.equals(me._id)) {
        await createNotification({
          recipient: post.author._id,
          sender: me._id,
          type: 'like',
          title: `${me.displayName} liked your post`,
          refModel: 'Post',
          refId: post._id,
        });
      }
    }

    await post.save();
    res.json({ liked: !alreadyLiked, likeCount: post.likes.length });
  } catch (err) { next(err); }
});

/**
 * POST /api/posts/:id/comments — add a comment
 */
router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });

    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id displayName').lean();
    const post = await Post.findById(req.params.id).populate('author', '_id');

    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.comments.push({ user: me._id, text: text.trim() });
    await post.save();

    // Notify post author
    if (!post.author._id.equals(me._id)) {
      await createNotification({
        recipient: post.author._id,
        sender: me._id,
        type: 'comment',
        title: `${me.displayName} commented on your post`,
        message: text.trim().slice(0, 100),
        refModel: 'Post',
        refId: post._id,
      });
    }

    // Return populated comment
    await post.populate('comments.user', 'username displayName avatar');
    const newComment = post.comments[post.comments.length - 1];
    res.status(201).json(newComment);
  } catch (err) { next(err); }
});

/**
 * DELETE /api/posts/:id/comments/:cid — delete a comment
 */
router.delete('/:id/comments/:cid', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id').lean();
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(req.params.cid);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    // Only comment author or post author can delete
    if (!comment.user.equals(me._id) && !post.author.equals(me._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    comment.deleteOne();
    await post.save();
    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
});

/**
 * POST /api/posts/:id/save — save/unsave a post
 */
router.post('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id').lean();
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: 'Post not found' });

    const saved = post.saves?.some(uid => uid.equals(me._id));
    if (saved) {
      post.saves.pull(me._id);
    } else {
      post.saves.push(me._id);
    }

    await post.save();
    res.json({ saved: !saved });
  } catch (err) { next(err); }
});

module.exports = router;
