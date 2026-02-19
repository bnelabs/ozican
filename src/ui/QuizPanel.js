/**
 * Quiz UI panel renderer for OzMos Solar System Explorer.
 * Renders quiz menu, question cards, results, and summary screens.
 */
import { t } from '../i18n/i18n.js';
import { QUIZ_CATEGORIES, QUIZ_QUESTIONS, shuffleQuestions, filterQuestions, getLocalizedQuestion } from '../data/quizQuestions.js';
import { escapeHTML, sanitizeHTML } from '../utils/sanitize.js';

/**
 * Renders the quiz category selection menu.
 * Shows category cards with icon, name, and question count,
 * plus difficulty and question count selectors.
 * @returns {string} HTML string
 */
export function renderQuizMenu() {
  let categoryCards = '';
  for (const cat of QUIZ_CATEGORIES) {
    categoryCards += `
      <button class="quiz-category-card" data-category="${escapeHTML(cat.id)}">
        <span class="cat-icon">${cat.icon}</span>
        <span class="cat-name">${escapeHTML(t(cat.name))}</span>
        <span class="cat-count">${escapeHTML(String(cat.count))} ${escapeHTML(t('quiz.questions'))}</span>
      </button>`;
  }

  return `
    <div class="quiz-menu">
      <h2 class="quiz-title">${t('quiz.title')}</h2>

      <div class="quiz-categories">
        ${categoryCards}
      </div>

      <div class="quiz-options-row">
        <div class="quiz-option-group">
          <label>${t('quiz.difficulty')}</label>
          <select id="quiz-difficulty">
            <option value="0">${t('quiz.all')}</option>
            <option value="1">${t('quiz.easy')}</option>
            <option value="2">${t('quiz.medium')}</option>
            <option value="3">${t('quiz.hard')}</option>
          </select>
        </div>

        <div class="quiz-option-group">
          <label>${t('quiz.questions')}</label>
          <select id="quiz-count">
            <option value="10">10</option>
            <option value="25">25</option>
          </select>
        </div>
      </div>

      <button class="quiz-start-btn" id="quiz-start-btn">${t('quiz.start')}</button>
    </div>`;
}

/**
 * Renders a single quiz question card.
 * @param {Object} question - The question object
 * @param {number} index - Zero-based question index
 * @param {number} total - Total questions in the quiz
 * @param {number|null} selectedAnswer - Index of selected answer, or null
 * @returns {string} HTML string
 */
export function renderQuizQuestion(question, index, total, selectedAnswer) {
  question = getLocalizedQuestion(question);
  const letters = ['A', 'B', 'C', 'D'];

  let optionsHtml = '';
  for (let i = 0; i < question.options.length; i++) {
    const selectedClass = selectedAnswer === i ? ' selected' : '';
    optionsHtml += `
      <button class="quiz-option${selectedClass}" data-index="${i}">
        <span class="quiz-option-letter">${escapeHTML(letters[i])}</span>
        <span class="quiz-option-text">${sanitizeHTML(question.options[i])}</span>
      </button>`;
  }

  return `
    <div class="quiz-question">
      <div class="quiz-progress">
        <progress class="quiz-progress-bar" value="${index + 1}" max="${total}" aria-label="${escapeHTML(t('quiz.questions'))} ${index + 1} / ${total}"></progress>
        <span class="quiz-progress-text">${escapeHTML(t('quiz.questions'))} ${index + 1} / ${total}</span>
      </div>
      <div class="quiz-question-text">${sanitizeHTML(question.question)}</div>
      <div class="quiz-options">
        ${optionsHtml}
      </div>
    </div>`;
}

/**
 * Renders the result for a single question (correct/incorrect + explanation).
 * @param {Object} question - The question object
 * @param {number} selectedAnswer - Index of the selected answer
 * @returns {string} HTML string
 */
export function renderQuizResult(question, selectedAnswer) {
  question = getLocalizedQuestion(question);
  const isCorrect = selectedAnswer === question.correct;
  const resultClass = isCorrect ? 'correct' : 'incorrect';
  const resultLabel = isCorrect ? t('quiz.correct') : t('quiz.incorrect');
  const letters = ['A', 'B', 'C', 'D'];

  let optionsHtml = '';
  for (let i = 0; i < question.options.length; i++) {
    let cls = 'quiz-option';
    if (i === question.correct) cls += ' correct';
    if (i === selectedAnswer && !isCorrect) cls += ' incorrect';
    optionsHtml += `
      <div class="${cls}">
        <span class="quiz-option-letter">${escapeHTML(letters[i])}</span>
        <span class="quiz-option-text">${sanitizeHTML(question.options[i])}</span>
      </div>`;
  }

  let learnMoreHtml = '';
  if (question.relatedPlanet) {
    learnMoreHtml = `
      <button class="quiz-learn-more" data-planet="${escapeHTML(question.relatedPlanet)}">
        ${escapeHTML(t('quiz.learnMore'))}
      </button>`;
  }

  return `
    <div class="quiz-result ${resultClass}">
      <div class="quiz-result-label">${escapeHTML(resultLabel)}</div>
      <div class="quiz-question-text">${sanitizeHTML(question.question)}</div>
      <div class="quiz-options">
        ${optionsHtml}
      </div>
      <div class="quiz-explanation">
        <strong>${escapeHTML(t('quiz.explanation'))}:</strong> ${sanitizeHTML(question.explanation)}
      </div>
      ${learnMoreHtml}
    </div>`;
}

/**
 * Renders the quiz summary screen with score, time, and review.
 * @param {Array} results - Array of { question, selectedAnswer, correct } objects
 * @param {number} totalTime - Total time in seconds
 * @returns {string} HTML string
 */
export function renderQuizSummary(results, totalTime) {
  const correctCount = results.filter(r => r.correct).length;
  const totalCount = results.length;
  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const minutes = Math.floor(totalTime / 60);
  const seconds = Math.floor(totalTime % 60);
  const timeStr = minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  // Build review of incorrect answers
  let reviewHtml = '';
  const incorrect = results.filter(r => !r.correct);
  if (incorrect.length > 0) {
    reviewHtml = '<div class="quiz-review">';
    for (const r of incorrect) {
      const letters = ['A', 'B', 'C', 'D'];
      const lq = getLocalizedQuestion(r.question);
      reviewHtml += `
        <div class="quiz-review-item">
          <div class="quiz-review-question">${sanitizeHTML(lq.question)}</div>
          <div class="quiz-review-answer incorrect">
            ${escapeHTML(t('quiz.incorrect'))}: ${escapeHTML(letters[r.selectedAnswer])} - ${sanitizeHTML(lq.options[r.selectedAnswer])}
          </div>
          <div class="quiz-review-answer correct">
            ${escapeHTML(t('quiz.correct'))}: ${escapeHTML(letters[lq.correct])} - ${sanitizeHTML(lq.options[lq.correct])}
          </div>
          <div class="quiz-explanation">${sanitizeHTML(lq.explanation)}</div>
        </div>`;
    }
    reviewHtml += '</div>';
  }

  return `
    <div class="quiz-summary">
      <h2 class="quiz-title">${t('quiz.score')}</h2>

      <div class="quiz-score">
        <div class="quiz-score-circle" data-percentage="${percentage}">
          <span class="quiz-score-value">${correctCount}/${totalCount}</span>
          <span class="quiz-score-percent">${percentage}%</span>
        </div>
      </div>

      <div class="quiz-time">
        ${t('quiz.time')}: ${timeStr}
      </div>

      ${reviewHtml}

      <button class="quiz-start-btn" id="quiz-play-again">${t('quiz.playAgain')}</button>
    </div>`;
}
