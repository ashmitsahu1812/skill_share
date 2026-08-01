/**
 * AI Service — Google Gemini Integration
 * Generates skill tests from creator's post content
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate test questions from a creator's posts using Gemini
 * @param {object} creator - creator user object
 * @param {Array} posts - array of Post documents to use as context
 * @param {string} skill - the skill being tested
 * @returns {Array} array of question objects
 */
async function generateTestQuestions({ creator, posts, skill, count = 10 }) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Build context from posts
  const postsContext = posts.map(p =>
    `Post: "${p.title}" — ${p.description || 'No description'} (Category: ${p.category}, Level: ${p.skillLevel || 'General'})`
  ).join('\n');

  const prompt = `
You are an educational assessment expert. Create a skill certification test based on the following skill showcase posts by ${creator.displayName}.

SKILL BEING TESTED: ${skill}

CREATOR'S POSTS FOR CONTEXT:
${postsContext}

INSTRUCTIONS:
- Generate exactly ${count} multiple-choice questions testing knowledge of "${skill}"
- Questions should range from easy (3 questions) to medium (5 questions) to hard (2 questions)
- Each question must have exactly 4 answer choices
- Make questions practical and knowledge-based, not trivial
- Base questions on the content themes shown in the creator's posts
- Provide a brief explanation for the correct answer

RESPOND WITH ONLY VALID JSON in this exact format (no markdown, no code blocks, just JSON):
{
  "title": "Skill test title here",
  "description": "Brief 1-2 sentence description of what this test covers",
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation why this is correct",
      "difficulty": "easy"
    }
  ]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse JSON response
    const parsed = JSON.parse(text);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid response structure from Gemini');
    }

    // Validate and sanitize questions
    const validated = parsed.questions
      .filter(q =>
        q.question &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correctAnswer === 'number' &&
        q.correctAnswer >= 0 &&
        q.correctAnswer <= 3
      )
      .slice(0, count);

    return {
      title: parsed.title || `${skill} Certification Test`,
      description: parsed.description || `Test your knowledge of ${skill}`,
      questions: validated,
    };
  } catch (err) {
    console.error('Gemini API error:', err.message);
    // Fallback to template questions if Gemini fails
    return generateFallbackQuestions(skill, count);
  }
}

/**
 * Fallback question generator if AI fails
 */
function generateFallbackQuestions(skill, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    questions.push({
      question: `Question ${i + 1} about ${skill}: Which of the following best describes a core principle of ${skill}?`,
      options: [
        `Fundamental concept A of ${skill}`,
        `Fundamental concept B of ${skill}`,
        `Fundamental concept C of ${skill}`,
        `Fundamental concept D of ${skill}`,
      ],
      correctAnswer: 0,
      explanation: `This is a placeholder question. Regenerate the test for AI-powered questions.`,
      difficulty: i < 3 ? 'easy' : i < 8 ? 'medium' : 'hard',
    });
  }
  return {
    title: `${skill} Knowledge Test`,
    description: `Test your knowledge of ${skill}`,
    questions,
  };
}

/**
 * Auto-grade a test submission
 * @param {Array} questions - test question objects with correctAnswer
 * @param {Array} userAnswers - user's selected answer indexes
 * @returns {{ score: number, correct: number, results: Array }}
 */
function gradeTest(questions, userAnswers) {
  let correct = 0;
  const results = questions.map((q, i) => {
    const isCorrect = userAnswers[i] === q.correctAnswer;
    if (isCorrect) correct++;
    return {
      question: q.question,
      userAnswer: userAnswers[i],
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const score = Math.round((correct / questions.length) * 100);
  return { score, correct, total: questions.length, results };
}

module.exports = { generateTestQuestions, gradeTest };
