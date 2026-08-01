/**
 * Test Routes
 * POST /api/tests/generate       — AI generate a test for a skill
 * GET  /api/tests/:id            — get test (without answers for non-owners)
 * POST /api/tests/:id/submit     — submit answers + auto-grade
 * GET  /api/tests/by-creator/:uid — tests by a creator
 */

const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const Post = require('../models/Post');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const { requireAuth } = require('../middleware/auth');
const { generateTestQuestions, gradeTest } = require('../services/aiService');
const { generateCertificate } = require('../services/certificateService');
const { createNotification } = require('../services/notificationService');
const { sendCertificateEmail } = require('../services/emailService');

/**
 * POST /api/tests/generate — generate a new AI test for a creator's skill
 */
router.post('/generate', requireAuth, async (req, res, next) => {
  try {
    const { skill, category, postIds, questionCount = 10 } = req.body;

    const creator = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    if (!creator) return res.status(404).json({ error: 'User not found' });

    // Get creator's posts for context
    const posts = await Post.find({
      _id: { $in: postIds || [] },
      author: creator._id,
    }).limit(10).lean();

    // If no specific posts, use latest posts from this category
    const contextPosts = posts.length > 0 ? posts :
      await Post.find({ author: creator._id, category }).sort({ createdAt: -1 }).limit(5).lean();

    // Generate questions via Gemini
    const { title, description, questions } = await generateTestQuestions({
      creator,
      posts: contextPosts,
      skill,
      count: Number(questionCount),
    });

    const test = await Test.create({
      creator: creator._id,
      skill,
      category,
      sourcePosts: contextPosts.map(p => p._id),
      title,
      description,
      questions,
      passingScore: Number(process.env.CERT_PASSING_SCORE) || 70,
    });

    // Mark source posts as having a test
    await Post.updateMany(
      { _id: { $in: contextPosts.map(p => p._id) } },
      { hasTest: true, testId: test._id }
    );

    res.status(201).json(test);
  } catch (err) { next(err); }
});

/**
 * GET /api/tests/by-creator/:creatorId
 */
router.get('/by-creator/:creatorId', async (req, res, next) => {
  try {
    const tests = await Test.find({ creator: req.params.creatorId, isPublished: true })
      .select('title skill category description timeLimit passingScore createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json(tests);
  } catch (err) { next(err); }
});

/**
 * GET /api/tests/:id — get test questions (hide correctAnswer for non-creators)
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('creator', 'username displayName avatar')
      .lean();

    if (!test) return res.status(404).json({ error: 'Test not found' });

    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id').lean();

    // Check if user already passed this test
    const myAttempt = test.attempts.find(a => a.user?.toString() === me._id.toString());

    // Hide correct answers (only show to test-taker during their attempt)
    const questions = test.questions.map(({ question, options, difficulty }) => ({
      question, options, difficulty,
    }));

    res.json({
      ...test,
      questions,
      myAttempt: myAttempt || null,
      attempts: undefined, // don't expose all attempts
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/tests/:id/submit — submit answers + grade + issue certificate if passed
 */
router.post('/:id/submit', requireAuth, async (req, res, next) => {
  try {
    const { answers, timeTaken } = req.body;

    const me = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    if (!me) return res.status(404).json({ error: 'User not found' });

    const test = await Test.findById(req.params.id).populate('creator');
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // Check if already passed
    const alreadyPassed = test.attempts.some(
      a => a.user?.toString() === me._id.toString() && a.passed
    );
    if (alreadyPassed) return res.status(400).json({ error: 'You have already passed this test' });

    // Grade the submission
    const { score, correct, total, results } = gradeTest(test.questions, answers);
    const passed = score >= test.passingScore;

    // Record attempt
    test.attempts.push({
      user: me._id,
      answers,
      score,
      passed,
      timeTaken: timeTaken || 0,
    });
    await test.save();

    let certificate = null;

    // Issue certificate if passed
    if (passed) {
      const existingCert = await Certificate.findOne({ holder: me._id, test: test._id });
      if (!existingCert) {
        // Create certificate record first (to get verificationCode)
        certificate = await Certificate.create({
          holder: me._id,
          issuer: test.creator._id,
          test: test._id,
          skill: test.skill,
          category: test.category,
          score,
        });

        // Generate PDF
        try {
          const { pdfUrl, pdfPublicId } = await generateCertificate({
            holder: me,
            issuer: test.creator,
            skill: test.skill,
            category: test.category,
            score,
            verificationCode: certificate.verificationCode,
            issuedAt: certificate.issuedAt,
          });

          certificate.pdfUrl = pdfUrl;
          certificate.pdfPublicId = pdfPublicId;
          await certificate.save();
        } catch (pdfErr) {
          console.error('PDF generation failed:', pdfErr.message);
          // Continue — cert exists even without PDF
        }

        // Add to user's certificates
        await User.findByIdAndUpdate(me._id, { $push: { certificates: certificate._id } });

        // Notifications & email
        await createNotification({
          recipient: me._id,
          type: 'certificate',
          title: `🎓 Certificate earned in ${test.skill}!`,
          message: `Score: ${score}%`,
          refModel: 'Certificate',
          refId: certificate._id,
        });

        await sendCertificateEmail(me, certificate, test.skill);
      }
    }

    res.json({ score, correct, total, passed, results, certificate });
  } catch (err) { next(err); }
});

module.exports = router;
