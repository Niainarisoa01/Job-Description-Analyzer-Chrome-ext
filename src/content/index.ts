import { AnalyzeRequest, AnalyzeResponse, ClearAnalysisMessage, ExtensionMessage, JobAnalysis, KeywordCategory } from '../utils/types';

/**
 * Initialize the content script
 */
function initialize() {
  console.log('Job Description Analyzer content script initialized');

  // Set up message listeners
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    console.log('Content script received message:', message.action);
    
    // Handle different message types
    switch (message.action) {
      case 'analyze':
        handleAnalyzeRequest();
        sendResponse({ received: true });
        break;
      
      case 'analyzeResult':
        handleAnalyzeResult(message as AnalyzeResponse);
        sendResponse({ received: true });
        break;
      
      case 'clearAnalysis':
        handleClearAnalysis();
        sendResponse({ received: true });
        break;
      
      case 'extractJobDescription':
        // Extract job description and send it back
        const jobText = extractJobDescription();
        console.log('Extracted job text:', jobText ? `${jobText.substring(0, 100)}...` : 'None found');
        sendResponse({ jobText });
        break;
      
      default:
        sendResponse({ received: false, error: 'Unknown action' });
        break;
    }
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  });
}

/**
 * Handle messages from other extension components
 * @param message The message to handle
 */
function handleMessage(message: ExtensionMessage, sender: any, sendResponse: any) {
  console.log('Content script received message:', message.action);

  switch (message.action) {
    case 'analyze':
      handleAnalyzeRequest();
      break;
    
    case 'analyzeResult':
      handleAnalyzeResult(message as AnalyzeResponse);
      break;
    
    case 'clearAnalysis':
      handleClearAnalysis();
      break;
    
    case 'extractJobDescription':
      // Extract job description and send it back
      const jobText = extractJobDescription();
      sendResponse({ jobText });
      return true; // Important: return true to indicate async response
    
    default:
      break;
  }
}

/**
 * Handle a request to analyze the current page
 */
async function handleAnalyzeRequest() {
  try {
    // Extract text from the page
    const jobText = extractJobDescription();

    if (!jobText) {
      alert('Could not extract job description from the page.');
      return;
    }

    // Send the text to the background script for analysis
    const request: AnalyzeRequest = {
      action: 'analyze',
      jobText,
    };

    chrome.runtime.sendMessage(request, (response: AnalyzeResponse) => {
      if (response && response.success && response.analysis) {
        // Display the analysis results
        displayAnalysisResults(response.analysis);
      } else {
        const errorMessage = response?.error || 'Unknown error';
        alert(`Analysis failed: ${errorMessage}`);
      }
    });
  } catch (error) {
    console.error('Error analyzing job description:', error);
    alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle an analysis result from the background script
 * @param response The analysis response
 */
function handleAnalyzeResult(response: AnalyzeResponse) {
  if (response.success && response.analysis) {
    displayAnalysisResults(response.analysis);
  } else {
    const errorMessage = response.error || 'Unknown error';
    alert(`Analysis failed: ${errorMessage}`);
  }
}

/**
 * Handle a request to clear the analysis
 */
function handleClearAnalysis() {
  removeFloatingPanel();
  removeHighlightedKeywords();
}

/**
 * Extract the job description from the current page
 * @returns The extracted job description text
 */
function extractJobDescription(): string {
  // This is a simplified extraction method
  // In a real extension, you'd use more sophisticated methods to identify job description content
  
  // Try to find the main content area
  const mainContent = document.querySelector('main') || 
                      document.querySelector('article') || 
                      document.querySelector('.job-description') ||
                      document.querySelector('.description');
  
  if (mainContent) {
    return mainContent.textContent || '';
  }
  
  // Fallback to the body content
  return document.body.textContent || '';
}

/**
 * Display the analysis results in a floating panel
 * @param analysis The job analysis to display
 */
function displayAnalysisResults(analysis: JobAnalysis) {
  // Remove any existing panel
  removeFloatingPanel();
  
  // Create the floating panel
  const panel = document.createElement('div');
  panel.className = 'jda-floating-panel';
  panel.id = 'jda-floating-panel';
  
  // Create the panel header
  const header = document.createElement('div');
  header.className = 'jda-panel-header';
  
  const title = document.createElement('h2');
  title.className = 'jda-panel-title';
  title.textContent = 'Job Analysis';
  
  const controls = document.createElement('div');
  controls.className = 'jda-panel-controls';
  
  const minimizeButton = document.createElement('button');
  minimizeButton.className = 'jda-panel-button';
  minimizeButton.innerHTML = '&#8722;'; // Minus sign
  minimizeButton.title = 'Minimize';
  minimizeButton.addEventListener('click', togglePanelMinimize);
  
  const closeButton = document.createElement('button');
  closeButton.className = 'jda-panel-button';
  closeButton.innerHTML = '&#10005;'; // X sign
  closeButton.title = 'Close';
  closeButton.addEventListener('click', removeFloatingPanel);
  
  controls.appendChild(minimizeButton);
  controls.appendChild(closeButton);
  
  header.appendChild(title);
  header.appendChild(controls);
  
  // Make the header draggable
  makeDraggable(header, panel);
  
  // Create the panel content
  const content = document.createElement('div');
  content.className = 'jda-panel-content';
  
  // Add summary section
  const summarySection = document.createElement('div');
  summarySection.className = 'jda-panel-section';
  
  const summaryTitle = document.createElement('h3');
  summaryTitle.className = 'jda-panel-section-title';
  summaryTitle.textContent = 'Summary';
  
  const summary = document.createElement('p');
  summary.className = 'jda-summary';
  summary.textContent = analysis.summary;
  
  summarySection.appendChild(summaryTitle);
  summarySection.appendChild(summary);
  
  content.appendChild(summarySection);
  
  // Add keyword categories
  analysis.keywordCategories.forEach(category => {
    const categorySection = createKeywordCategorySection(category);
    content.appendChild(categorySection);
  });
  
  // Assemble the panel
  panel.appendChild(header);
  panel.appendChild(content);
  
  // Add the panel to the page
  document.body.appendChild(panel);
  
  // Highlight keywords in the page
  highlightKeywords(analysis.keywordCategories);
}

/**
 * Create a section for a keyword category
 * @param category The keyword category
 * @returns The category section element
 */
function createKeywordCategorySection(category: KeywordCategory): HTMLElement {
  const section = document.createElement('div');
  section.className = 'jda-panel-section';
  
  const title = document.createElement('h3');
  title.className = 'jda-panel-section-title';
  title.textContent = category.name;
  
  const keywordList = document.createElement('ul');
  keywordList.className = 'jda-keyword-list';
  
  category.keywords.forEach(keyword => {
    const item = document.createElement('li');
    item.className = 'jda-keyword-item';
    item.textContent = keyword;
    keywordList.appendChild(item);
  });
  
  section.appendChild(title);
  section.appendChild(keywordList);
  
  return section;
}

/**
 * Make an element draggable
 * @param handle The drag handle element
 * @param element The element to make draggable
 */
function makeDraggable(handle: HTMLElement, element: HTMLElement) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  handle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e: MouseEvent) {
    e.preventDefault();
    // Get the mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call a function whenever the cursor moves
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e: MouseEvent) {
    e.preventDefault();
    // Calculate the new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set the element's new position
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

/**
 * Toggle the minimized state of the panel
 */
function togglePanelMinimize() {
  const panel = document.getElementById('jda-floating-panel');
  const content = panel?.querySelector('.jda-panel-content');
  
  if (panel && content) {
    if ((content as HTMLElement).style.display === 'none') {
      // Expand
      (content as HTMLElement).style.display = 'block';
      (panel as HTMLElement).style.height = 'auto';
    } else {
      // Minimize
      (content as HTMLElement).style.display = 'none';
      (panel as HTMLElement).style.height = 'auto';
    }
  }
}

/**
 * Remove the floating panel from the page
 */
function removeFloatingPanel() {
  const panel = document.getElementById('jda-floating-panel');
  if (panel) {
    panel.remove();
  }
}

/**
 * Highlight keywords in the page content
 * @param categories The keyword categories to highlight
 */
function highlightKeywords(categories: KeywordCategory[]) {
  // Remove any existing highlights
  removeHighlightedKeywords();
  
  // Get all the keywords
  const keywords = categories.flatMap(category => category.keywords);
  
  // Create a regex to match the keywords
  const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
  
  // Find all text nodes in the body
  const textNodes = findTextNodes(document.body);
  
  // Highlight the keywords in each text node
  textNodes.forEach(node => {
    const text = node.nodeValue;
    if (!text || !keywordRegex.test(text)) return;
    
    // Reset the regex
    keywordRegex.lastIndex = 0;
    
    // Create a document fragment to hold the new nodes
    const fragment = document.createDocumentFragment();
    
    let lastIndex = 0;
    let match;
    
    // Find all matches
    while ((match = keywordRegex.exec(text)) !== null) {
      // Add the text before the match
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
      }
      
      // Add the highlighted match
      const span = document.createElement('span');
      span.className = 'jda-highlighted-keyword';
      span.textContent = match[0];
      fragment.appendChild(span);
      
      lastIndex = keywordRegex.lastIndex;
    }
    
    // Add any remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
    
    // Replace the original node with the fragment
    if (node.parentNode) {
      node.parentNode.replaceChild(fragment, node);
    }
  });
}

/**
 * Find all text nodes in an element
 * @param element The element to search
 * @returns Array of text nodes
 */
function findTextNodes(element: Node): Text[] {
  const textNodes: Text[] = [];
  
  // Skip script and style elements
  if (
    element.nodeName === 'SCRIPT' || 
    element.nodeName === 'STYLE' || 
    element.nodeName === 'NOSCRIPT' ||
    element.nodeName === 'IFRAME' ||
    element.nodeName === 'OBJECT' ||
    element.nodeName === 'EMBED' ||
    element.nodeName === 'APPLET' ||
    element.nodeName === 'AUDIO' ||
    element.nodeName === 'CANVAS' ||
    element.nodeName === 'VIDEO' ||
    element.nodeName === 'SVG' ||
    element.nodeName === 'MAP' ||
    element.nodeName === 'BUTTON' ||
    element.nodeName === 'SELECT' ||
    element.nodeName === 'TEXTAREA' ||
    element.nodeName === 'INPUT'
  ) {
    return textNodes;
  }
  
  // Skip our own elements
  if (
    element instanceof HTMLElement && 
    (element.id === 'jda-floating-panel' || element.classList.contains('jda-highlighted-keyword'))
  ) {
    return textNodes;
  }
  
  // Check if this is a text node
  if (element.nodeType === Node.TEXT_NODE && element.nodeValue && element.nodeValue.trim()) {
    textNodes.push(element as Text);
  }
  
  // Recursively check child nodes
  for (let i = 0; i < element.childNodes.length; i++) {
    textNodes.push(...findTextNodes(element.childNodes[i]));
  }
  
  return textNodes;
}

/**
 * Remove highlighted keywords from the page
 */
function removeHighlightedKeywords() {
  const highlights = document.querySelectorAll('.jda-highlighted-keyword');
  
  highlights.forEach(highlight => {
    if (highlight.parentNode) {
      highlight.parentNode.replaceChild(
        document.createTextNode(highlight.textContent || ''),
        highlight
      );
    }
  });
}

// Initialize the content script
initialize(); 