const textInput = document.getElementById('textInput');
const applyBtn = document.getElementById('applyBtn');
const clearBtn = document.getElementById('clearBtn');
const board = document.getElementById('board');
const selectionBox = document.getElementById('selectionBox');

let letterElements = [];
let selectedLetters = new Set();

let isSelecting = false;
let startBoxX = 0;
let startBoxY = 0;

let isDragging = false;
let dragTarget = null;
let startMouseX = 0;
let startMouseY = 0;
let hasMoved = false;
let initialPositions = new Map();

applyBtn.addEventListener('click', (event) => {
  event.preventDefault();
  renderTextInputToBoard();
});

textInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    renderTextInputToBoard();
  }
});

clearBtn.addEventListener('click', () => {
  textInput.value = '';
  clearBoardLetters();
});

board.addEventListener('mousedown', (event) => {
  if (event.target !== board || event.button !== 0) return;

  const isMultiSelectModifier = event.ctrlKey || event.metaKey;
  if (!isMultiSelectModifier) {
    clearAllSelectedLetters();
  }

  isSelecting = true;
  const boardRect = board.getBoundingClientRect();
  startBoxX = event.clientX - boardRect.left;
  startBoxY = event.clientY - boardRect.top;

  selectionBox.style.left = startBoxX + 'px';
  selectionBox.style.top = startBoxY + 'px';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  selectionBox.style.display = 'block';
});

function renderTextInputToBoard() {
  clearBoardLetters();

  const text = textInput.value;
  if (!text) return;

  const boardWidth = board.clientWidth || 800;
  let currentX = 20;
  let currentY = 20;
  const gapX = 8;
  const gapY = 12;
  const rowHeight = 44;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const letterSpan = document.createElement('span');
    letterSpan.className = 'letter';

    if (char === ' ') {
      letterSpan.classList.add('space');
      letterSpan.innerHTML = '&nbsp;';
    } else {
      letterSpan.textContent = char;
    }

    board.appendChild(letterSpan);

    const letterWidth = letterSpan.offsetWidth || 34;

    if (currentX + letterWidth > boardWidth - 20) {
      currentX = 20;
      currentY += rowHeight + gapY;
    }

    letterSpan.style.left = currentX + 'px';
    letterSpan.style.top = currentY + 'px';

    currentX += letterWidth + gapX;

    attachLetterEventListeners(letterSpan);
    letterElements.push(letterSpan);
  }

  resolveOverlappingLetterPositions();
}

function clearBoardLetters() {
  letterElements.forEach(element => element.remove());
  letterElements = [];
  selectedLetters.clear();
}

function attachLetterEventListeners(letterElement) {
  letterElement.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();

    const isMultiSelectModifier = event.ctrlKey || event.metaKey;

    if (isMultiSelectModifier) {
      toggleLetterSelection(letterElement);
    } else {
      if (!selectedLetters.has(letterElement)) {
        clearAllSelectedLetters();
        selectLetterElement(letterElement);
      }
    }

    startDraggingLetters(event, letterElement);
  });
}

function selectLetterElement(letterElement) {
  selectedLetters.add(letterElement);
  letterElement.classList.add('selected');
}

function deselectLetterElement(letterElement) {
  selectedLetters.delete(letterElement);
  letterElement.classList.remove('selected');
}

function toggleLetterSelection(letterElement) {
  if (selectedLetters.has(letterElement)) {
    deselectLetterElement(letterElement);
  } else {
    selectLetterElement(letterElement);
  }
}

function clearAllSelectedLetters() {
  selectedLetters.forEach(element => element.classList.remove('selected'));
  selectedLetters.clear();
}

function startDraggingLetters(event, targetElement) {
  isDragging = true;
  hasMoved = false;
  dragTarget = targetElement;
  startMouseX = event.clientX;
  startMouseY = event.clientY;

  initialPositions.clear();

  const elementsToMove = selectedLetters.has(targetElement)
    ? Array.from(selectedLetters)
    : [targetElement];

  elementsToMove.forEach(element => {
    element.classList.add('dragging');
    initialPositions.set(element, {
      left: parseFloat(element.style.left) || 0,
      top: parseFloat(element.style.top) || 0
    });
  });
}

document.addEventListener('mousemove', (event) => {
  if (!board) return;
  const boardRect = board.getBoundingClientRect();

  if (isSelecting) {
    const currentX = event.clientX - boardRect.left;
    const currentY = event.clientY - boardRect.top;

    const left = Math.min(startBoxX, currentX);
    const top = Math.min(startBoxY, currentY);
    const width = Math.abs(currentX - startBoxX);
    const height = Math.abs(currentY - startBoxY);

    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';

    const boxRect = {
      left: left,
      top: top,
      right: left + width,
      bottom: top + height
    };

    letterElements.forEach(letterElement => {
      const letterLeft = parseFloat(letterElement.style.left) || 0;
      const letterTop = parseFloat(letterElement.style.top) || 0;
      const letterRect = {
        left: letterLeft,
        top: letterTop,
        right: letterLeft + letterElement.offsetWidth,
        bottom: letterTop + letterElement.offsetHeight
      };

      if (areRectanglesIntersecting(boxRect, letterRect)) {
        selectLetterElement(letterElement);
      } else if (!event.ctrlKey && !event.metaKey) {
        deselectLetterElement(letterElement);
      }
    });
    return;
  }

  if (isDragging) {
    const rawDx = event.clientX - startMouseX;
    const rawDy = event.clientY - startMouseY;

    if (Math.hypot(rawDx, rawDy) > 3) {
      hasMoved = true;
    }

    let dx = rawDx;
    let dy = rawDy;

    initialPositions.forEach((startPos, element) => {
      const maxLeft = boardRect.width - element.offsetWidth;
      const maxTop = boardRect.height - element.offsetHeight;

      const minAllowedX = -startPos.left;
      const maxAllowedX = maxLeft - startPos.left;
      const minAllowedY = -startPos.top;
      const maxAllowedY = maxTop - startPos.top;

      dx = Math.max(minAllowedX, Math.min(dx, maxAllowedX));
      dy = Math.max(minAllowedY, Math.min(dy, maxAllowedY));
    });

    initialPositions.forEach((startPos, element) => {
      element.style.left = (startPos.left + dx) + 'px';
      element.style.top = (startPos.top + dy) + 'px';
    });
  }
});

document.addEventListener('mouseup', (event) => {
  if (isSelecting) {
    isSelecting = false;
    if (selectionBox) selectionBox.style.display = 'none';
  }

  if (isDragging) {
    initialPositions.forEach((_, element) => element.classList.remove('dragging'));

    const isMultiSelectModifier = event.ctrlKey || event.metaKey;

    if (!hasMoved && !isMultiSelectModifier && dragTarget) {
      if (selectedLetters.size > 1) {
        clearAllSelectedLetters();
        selectLetterElement(dragTarget);
      } else if (selectedLetters.has(dragTarget)) {
        deselectLetterElement(dragTarget);
      }
    }

    if (initialPositions.size === 1 && dragTarget && hasMoved) {
      swapSingleMovedLetterWithTarget(dragTarget);
    }

    resolveOverlappingLetterPositions();

    isDragging = false;
    dragTarget = null;
    initialPositions.clear();
  }
});

function swapSingleMovedLetterWithTarget(movedLetterElement) {
  const movedPos = initialPositions.get(movedLetterElement);
  if (!movedPos) return;

  const movedRect = movedLetterElement.getBoundingClientRect();
  const movedCenter = {
    x: movedRect.left + movedRect.width / 2,
    y: movedRect.top + movedRect.height / 2
  };

  let targetLetterElement = null;
  let maxArea = 0;

  for (const otherElement of letterElements) {
    if (otherElement === movedLetterElement) continue;

    const otherRect = otherElement.getBoundingClientRect();
    const isInside = (
      movedCenter.x >= otherRect.left &&
      movedCenter.x <= otherRect.right &&
      movedCenter.y >= otherRect.top &&
      movedCenter.y <= otherRect.bottom
    );

    const xOverlap = Math.max(0, Math.min(movedRect.right, otherRect.right) - Math.max(movedRect.left, otherRect.left));
    const yOverlap = Math.max(0, Math.min(movedRect.bottom, otherRect.bottom) - Math.max(movedRect.top, otherRect.top));
    const overlapArea = xOverlap * yOverlap;

    if (isInside || overlapArea > maxArea) {
      maxArea = overlapArea;
      targetLetterElement = otherElement;
    }
  }

  if (targetLetterElement) {
    const targetLeft = parseFloat(targetLetterElement.style.left) || 0;
    const targetTop = parseFloat(targetLetterElement.style.top) || 0;

    targetLetterElement.style.left = movedPos.left + 'px';
    targetLetterElement.style.top = movedPos.top + 'px';

    movedLetterElement.style.left = targetLeft + 'px';
    movedLetterElement.style.top = targetTop + 'px';
  }
}

function resolveOverlappingLetterPositions() {
  if (!board || letterElements.length < 2) return;

  const boardWidth = board.clientWidth || window.innerWidth;
  const boardHeight = board.clientHeight || window.innerHeight;
  const padding = 6;

  for (let iter = 0; iter < 12; iter++) {
    let hadOverlap = false;

    for (let i = 0; i < letterElements.length; i++) {
      for (let j = i + 1; j < letterElements.length; j++) {
        const letterA = letterElements[i];
        const letterB = letterElements[j];

        const aLeft = parseFloat(letterA.style.left) || 0;
        const aTop = parseFloat(letterA.style.top) || 0;
        const aWidth = letterA.offsetWidth || 34;
        const aHeight = letterA.offsetHeight || 42;

        const bLeft = parseFloat(letterB.style.left) || 0;
        const bTop = parseFloat(letterB.style.top) || 0;
        const bWidth = letterB.offsetWidth || 34;
        const bHeight = letterB.offsetHeight || 42;

        const overlapX = Math.min(aLeft + aWidth, bLeft + bWidth) - Math.max(aLeft, bLeft);
        const overlapY = Math.min(aTop + aHeight, bTop + bHeight) - Math.max(aTop, bTop);

        if (overlapX > 0 && overlapY > 0) {
          hadOverlap = true;

          if (overlapX < overlapY) {
            const shift = (overlapX + padding) / 2;
            if (aLeft < bLeft) {
              letterA.style.left = Math.max(0, aLeft - shift) + 'px';
              letterB.style.left = Math.min(boardWidth - bWidth, bLeft + shift) + 'px';
            } else {
              letterA.style.left = Math.min(boardWidth - aWidth, aLeft + shift) + 'px';
              letterB.style.left = Math.max(0, bLeft - shift) + 'px';
            }
          } else {
            const shift = (overlapY + padding) / 2;
            if (aTop < bTop) {
              letterA.style.top = Math.max(0, aTop - shift) + 'px';
              letterB.style.top = Math.min(boardHeight - bHeight, bTop + shift) + 'px';
            } else {
              letterA.style.top = Math.min(boardHeight - aHeight, aTop + shift) + 'px';
              letterB.style.top = Math.max(0, bTop - shift) + 'px';
            }
          }
        }
      }
    }

    if (!hadOverlap) break;
  }
}

function areRectanglesIntersecting(rectA, rectB) {
  return !(
    rectB.left > rectA.right ||
    rectB.right < rectA.left ||
    rectB.top > rectA.bottom ||
    rectB.bottom < rectA.top
  );
}
