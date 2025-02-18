let currentHoveredLink = null;
let previewBox = null;
let debounceTimer;
let activeRequestController = null;

function createPreviewBox() {
  previewBox = document.createElement('div');
  previewBox.id = 'deepseek-preview';
  previewBox.style.position = 'fixed';
  previewBox.style.zIndex = '999999';
  previewBox.style.display = 'none';
  previewBox.style.backgroundColor = '#fff';
  previewBox.style.border = '1px solid #e5e7eb';
  previewBox.style.borderRadius = '8px';
  previewBox.style.padding = '16px';
  previewBox.style.maxWidth = '320px';
  previewBox.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
  previewBox.style.fontFamily = 'system-ui, sans-serif';
  previewBox.style.pointerEvents = 'none';
  previewBox.style.transition = 'opacity 0.2s ease';
  document.body.appendChild(previewBox);
}

function cancelActiveRequest() {
  if (activeRequestController) {
    activeRequestController.abort();
    activeRequestController = null;
  }
}

// Handle mouseover events with debouncing
document.addEventListener('mouseover', (event) => {
  const link = event.target.closest('a');
  if (!link || link.href === currentHoveredLink) return;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    cancelActiveRequest();
    activeRequestController = new AbortController();
    
    try {
      currentHoveredLink = link.href;
      const { clientX: x, clientY: y } = event;
      
      positionPreviewBox(x, y);
      showLoadingState();
      
      const response = await chrome.runtime.sendMessage({
        type: 'analyzeLink',
        url: link.href
      });

      if (currentHoveredLink === link.href) {
        handleAnalysisResponse(response);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        showErrorState('Analysis interrupted');
      }
    }
  }, 300);
});

// Handle mouseout events
document.addEventListener('mouseout', (event) => {
  if (event.target.closest('a')) {
    clearTimeout(debounceTimer);
    cancelActiveRequest();
    hidePreviewBox();
  }
});

function positionPreviewBox(x, y) {
  previewBox.style.left = `${x + 15}px`;
  previewBox.style.top = `${y + 15}px`;
}

function showLoadingState() {
  previewBox.style.display = 'block';
  previewBox.style.opacity = '1';
  previewBox.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div class="loading-spinner" style="
        width: 16px;
        height: 16px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
      Analyzing content...
    </div>
  `;
}

function handleAnalysisResponse(response) {
  if (response.error) {
    showErrorState(response.message, response.details, response.retryable);
  } else {
    showContent(response.content);
  }
}

function showContent(content) {
  previewBox.style.opacity = '1';
  previewBox.innerHTML = `
    <div style="font-size: 0.9em; line-height: 1.5;">
      ${marked.parse(content)}
    </div>
  `;
}

function showErrorState(message, details, retryable = true) {
  previewBox.innerHTML = `
    <div style="color: #dc2626; font-size: 0.9em;">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
        <svg style="width: 16px; height: 16px; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <strong>${message}</strong>
      </div>
      ${details ? `<div style="font-size: 0.8em; margin-bottom: 8px;">${details}</div>` : ''}
      ${retryable ? '<div style="font-size: 0.8em; color: #4b5563;">Try hovering again</div>' : ''}
    </div>
  `;
}

function hidePreviewBox() {
  previewBox.style.opacity = '0';
  setTimeout(() => {
    previewBox.style.display = 'none';
    currentHoveredLink = null;
  }, 200);
}

createPreviewBox();
