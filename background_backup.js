// Enhanced Background Script with AI Integration
console.log('🔧 Background script starting...');
console.log('🆔 Extension ID:', chrome.runtime.id);

// Embedded AI configuration - Updated to latest Gemini API endpoint
const GEMINI_API_KEY = 'AIzaSyCoNFODrVovsQEFa4nseHbv0d56eMqhtDU';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// Track processed elements to avoid duplicates
const processedElements = new Set();

// Initialize extension state on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Extension startup detected');
  initializeExtensionState();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('🎯 Extension installed');
  initializeExtensionState();
});

function initializeExtensionState() {
  // Ensure default state exists
  chrome.storage.sync.get(['extensionEnabled'], (result) => {
    if (result.extensionEnabled === undefined) {
      console.log('🔧 No existing state found, setting default to enabled');
      chrome.storage.sync.set({ extensionEnabled: true }, () => {
        console.log('✅ Default state set to enabled');
      });
    } else {
      console.log('✅ Existing state found:', result.extensionEnabled);
    }
  });
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message);
  console.log('👤 Message sender:', sender);
  
  if (message.action === 'getState') {
    console.log('🔍 Processing getState request...');
    chrome.storage.sync.get(['extensionEnabled'], (result) => {
      const enabled = result.extensionEnabled !== undefined ? result.extensionEnabled : true;
      console.log('📤 Sending state response:', { enabled });
      sendResponse({ enabled });
    });
    return true; // Keep message channel open
  }
  
  if (message.action === 'setState') {
    console.log('🔧 Processing setState request, enabled:', message.enabled);
    chrome.storage.sync.set({ extensionEnabled: message.enabled }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error saving state:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('✅ Extension state saved:', message.enabled);
        sendResponse({ success: true });
      }
    });
    return true;
  }
  
  if (message.action === 'analyzeElements') {
    handleAIAnalysis(message.elements, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'analyzeDOMStructure') {
    handleDOMAnalysis(message, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'analyzeViewportDOM') {
    handleViewportDOMAnalysis(message, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'analyzeBatchDOM') {
    handleBatchDOMAnalysis(message, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'analyzeCompleteDOM') {
    handleCompleteDOMAnalysis(message, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'testAPIKey') {
    testGeminiAPI(sendResponse);
    return true;
  }
  
  if (message.action === 'analyzeCompletePageContent') {
    console.log('🤖 Complete page content analysis requested');
    handleCompletePageAnalysis(message.data, sendResponse);
    return true;
  }
});

async function handleCompletePageAnalysis(analysisPayload, sendResponse) {
  const analysisStartTime = Date.now();
  console.log('🤖 Starting complete page content analysis for sensitive information detection');
  
  try {
    const { pageInfo, completeDOM, detectedElements } = analysisPayload;
    
    console.log('📊 Analysis payload:', {
      url: pageInfo.url,
      domElements: completeDOM.length,
      preDetectedElements: detectedElements.length
    });
    
    // Create comprehensive prompt for Gemini
    const analysisPrompt = createCompletePageAnalysisPrompt(pageInfo, completeDOM, detectedElements);
    
    console.log('🔤 Sending analysis prompt to Gemini (length:', analysisPrompt.length, 'chars)');
    
    // Send to Gemini for analysis
    const geminiResponse = await callGeminiAPIForCompletePageAnalysis(analysisPrompt);
    
    if (geminiResponse && geminiResponse.success) {
      console.log('✅ Gemini analysis completed successfully');
      
      // Parse Gemini response for detected sensitive elements
      const aiDetectedElements = parseGeminiSensitiveContentResponse(geminiResponse.data, completeDOM);
      
      console.log(`🧠 AI detected ${aiDetectedElements.length} additional sensitive elements`, {
        analysisTime: Date.now() - analysisStartTime + 'ms'
      });
      
      sendResponse({
        success: true,
        detectedElements: aiDetectedElements,
        newDetections: aiDetectedElements.length,
        enhancedClassifications: detectedElements.length,
        analysisTime: Date.now() - analysisStartTime
      });
      
    } else {
      console.warn('⚠️ Gemini analysis failed');
      sendResponse({
        success: false,
        error: 'Gemini analysis failed',
        detectedElements: []
      });
    }
    
  } catch (error) {
    console.error('❌ Error in complete page analysis:', error);
    sendResponse({
      success: false,
      error: error.message,
      detectedElements: []
    });
  }
}

function createCompletePageAnalysisPrompt(pageInfo, domElements, detectedElements) {
  const prompt = `
SENSITIVE INFORMATION DETECTION AND CLASSIFICATION

PAGE CONTEXT:
- URL: ${pageInfo.url}
- Title: ${pageInfo.title}
- Analysis Type: Complete page visible text content classification

TASK: Analyze the complete page DOM and classify ALL visible text content that contains sensitive information.

DETECTION CATEGORIES:
1. PERSONAL_INFO: email addresses, phone numbers, names, addresses
2. FINANCIAL: credit card numbers, account numbers, routing numbers, monetary amounts
3. IDENTIFICATION: SSN, tax IDs, passport numbers, license numbers
4. TECHNICAL: IP addresses, API keys, tokens, credentials
5. HEALTHCARE: patient IDs, medical record numbers, insurance numbers
6. BUSINESS: employee IDs, internal codes, proprietary information

PRE-DETECTED ELEMENTS (already found by pattern matching):
${detectedElements.map(el => `- ${el.tagName}: "${el.textContent.substring(0, 100)}" [${el.sensitiveType}]`).join('\n')}

COMPLETE DOM ELEMENTS TO ANALYZE:
${domElements.slice(0, 50).map(el => `
Element: ${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ')[0] : ''}
Text: "${el.textContent}"
Selector: ${el.selector}
`).join('\n')}

INSTRUCTIONS:
1. Examine ALL visible text content in the DOM elements
2. Identify ANY sensitive information not already detected
3. Classify each finding with confidence level (0.0-1.0)
4. Provide CSS selector for precise element identification
5. Explain reasoning for each classification

RESPONSE FORMAT (JSON only):
{
  "detectedElements": [
    {
      "selector": "css-selector-here",
      "type": "email|phone|credit-card|ssn|ip-address|etc",
      "category": "PERSONAL_INFO|FINANCIAL|IDENTIFICATION|TECHNICAL|HEALTHCARE|BUSINESS",
      "confidence": 0.95,
      "reasoning": "Brief explanation of why this is sensitive",
      "sensitivity": "high|medium|low",
      "textContent": "relevant portion of text content",
      "detectedValue": "the actual sensitive value found"
    }
  ]
}

Focus on finding sensitive information displayed as text content (not input fields). Look for account details, personal information, financial data, etc. that users might see on banking sites, profile pages, or account dashboards.
`;

  return prompt;
}

function parseGeminiSensitiveContentResponse(responseData, domElements) {
  try {
    console.log('🔍 Parsing Gemini response for sensitive content detections');
    
    // Extract JSON from Gemini response
    let jsonContent = responseData;
    if (typeof responseData === 'string') {
      const jsonMatch = responseData.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = JSON.parse(jsonMatch[0]);
      } else {
        console.warn('⚠️ No JSON found in Gemini response');
        return [];
      }
    }
    
    const detectedElements = jsonContent.detectedElements || [];
    console.log(`🧠 Parsed ${detectedElements.length} AI-detected sensitive elements`);
    
    // Validate and enhance each detection
    const validDetections = detectedElements.filter(element => {
      return element.selector && 
             element.type && 
             element.category && 
             element.confidence && 
             element.confidence >= 0.6; // Minimum confidence threshold
    }).map(element => ({
      ...element,
      aiModelUsed: 'gemini-1.5-flash',
      detectionMethod: 'ai-complete-page-analysis',
      timestamp: new Date().toISOString()
    }));
    
    console.log(`✅ ${validDetections.length} valid AI detections ready for processing`);
    return validDetections;
    
  } catch (error) {
    console.error('❌ Error parsing Gemini response:', error);
    return [];
  }
}

async function handleAIAnalysis(elements, sendResponse) {
  try {
    console.log('🤖 AI Analysis requested for', elements.length, 'elements');
    
    // Filter out already processed elements
    const newElements = elements.filter(element => {
      const elementKey = generateElementHash(element);
      if (processedElements.has(elementKey)) {
        return false;
      }
      processedElements.add(elementKey);
      return true;
    });
    
    if (newElements.length === 0) {
      console.log('⏭️ No new elements to analyze');
      sendResponse({ success: true, results: [], newElementsCount: 0 });
      return;
    }
    
    console.log('🎯 Analyzing', newElements.length, 'new elements');
    
    // Prepare minimal data for AI
    const elementsForAI = newElements.map(element => ({
      type: element.type,
      name: element.name || '',
      id: element.id || '',
      placeholder: element.placeholder || '',
      autocomplete: element.autocomplete || '',
      className: element.className || ''
    }));
    
    const aiResults = await callGeminiAPI(elementsForAI);
    
    sendResponse({ 
      success: true, 
      results: aiResults,
      newElementsCount: newElements.length,
      totalProcessed: processedElements.size
    });
    
  } catch (error) {
    console.error('❌ AI Analysis failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleViewportDOMAnalysis(message, sendResponse) {
  try {
    const startTime = Date.now();
    console.log('👁️ Viewport DOM Analysis requested');
    console.log('📐 Viewport:', `${message.viewport.width}x${message.viewport.height} at (${message.viewport.scrollX}, ${message.viewport.scrollY})`);
    console.log('📄 Visible DOM size:', Math.round(message.visibleDOM.length / 1024), 'KB');
    
    // Create viewport hash for caching
    const viewportHash = generateViewportHash(message.viewport, message.visibleDOM);
    
    if (processedElements.has(viewportHash)) {
      console.log('⏭️ Similar viewport already analyzed, skipping');
      sendResponse({ success: true, results: [], processingTime: 0, cached: true });
      return;
    }
    
    // Mark this viewport as processed
    processedElements.add(viewportHash);
    
    const aiResults = await callGeminiForViewport(message);
    const processingTime = Date.now() - startTime;
    
    sendResponse({ 
      success: true, 
      results: aiResults,
      processingTime: processingTime,
      viewportSize: `${message.viewport.width}x${message.viewport.height}`,
      domSize: message.visibleDOM.length,
      scrollPosition: `${message.viewport.scrollX}, ${message.viewport.scrollY}`
    });
    
  } catch (error) {
    console.error('❌ Viewport DOM Analysis failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function callGeminiForViewport(message) {
  const prompt = createViewportAnalysisPrompt(message);
  
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 0.8,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ]
  };
  
  console.log('🚀 Sending viewport DOM to Gemini AI for classification...');
  
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', response.status, errorText);
      
      // Try alternative API endpoint if main fails
      if (response.status === 404) {
        console.log('🔄 Trying alternative Gemini endpoint...');
        return await callGeminiAlternativeEndpoint(requestBody, 'viewport');
      }
      
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Gemini AI viewport classification complete');
    
    return parseViewportAnalysisResponse(data);
    
  } catch (error) {
    console.error('❌ AI Classification failed:', error);
    
    // Fallback to pattern-based classification
    console.log('🔄 Falling back to enhanced pattern-based classification...');
    return performFallbackPatternClassification(message.visibleDOM);
  }
}

function createViewportAnalysisPrompt(message) {
  return `You are an expert in web security and sensitive data classification. Analyze this visible webpage section and identify ALL form fields that could collect SENSITIVE user data.

CONTEXT:
- URL: ${message.pageURL}
- Page Title: ${message.pageTitle}
- Viewport: ${message.viewport.width}x${message.viewport.height}

VISIBLE DOM CONTENT:
${message.visibleDOM}

CLASSIFICATION TASK: 
Identify form fields (input, textarea, select) that could contain sensitive data:

🔴 HIGH SENSITIVITY (Critical Security Risk):
- Passwords, PINs, security codes, OTP/2FA tokens
- Credit card numbers, CVV codes, expiration dates
- Social Security Numbers, Tax IDs, National IDs
- Bank account numbers, routing numbers, IBAN
- Biometric data, security questions/answers

🟡 MEDIUM SENSITIVITY (Personal Data):
- Email addresses, usernames, login IDs
- Full names, first name, last name
- Phone numbers, mobile numbers
- Home addresses, postal codes, ZIP codes
- Date of birth, age

🟢 LOW SENSITIVITY (General Information):
- Company names, job titles
- Preferences, settings, non-personal choices
- Public information, general comments

ANALYSIS CRITERIA:
1. Examine field attributes: name, id, placeholder, type, autocomplete
2. Look at surrounding labels and context
3. Consider form purpose and page type
4. Check for password/security patterns
5. Identify financial/payment fields
6. Detect personal identification fields

RESPONSE FORMAT - Valid JSON Array Only:
[
  {
    "selector": "unique CSS selector (id, name, or position-based)",
    "type": "input type (password, email, text, tel, etc.)",
    "sensitivity": "high|medium|low",
    "category": "password|financial|personal|contact|security|identification",
    "reason": "specific reason why this field is sensitive",
    "confidence": "0.95 for obvious fields, 0.8 for contextual, 0.6 for uncertain",
    "fieldName": "name attribute value",
    "fieldId": "id attribute value",
    "placeholder": "placeholder text",
    "context": "surrounding label or form context"
  }
]

If no sensitive fields found: []

IMPORTANT: Only classify fields that actually exist in the DOM and truly handle sensitive data. Be specific with selectors.`;
}

function parseViewportAnalysisResponse(aiData) {
  try {
    const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('🔍 Viewport Analysis Response:', responseText.substring(0, 300) + '...');
    
    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('⚠️ Could not parse viewport analysis response as JSON');
      return [];
    }
    
    const sensitiveFields = JSON.parse(jsonMatch[0]);
    console.log('🎯 AI identified', sensitiveFields.length, 'sensitive fields in viewport');
    
    // Validate and process results
    return sensitiveFields.filter(field => {
      return field.selector && field.type && field.category && field.reason;
    }).map(field => ({
      ...field,
      confidence: field.sensitivity === 'high' ? 0.9 : field.sensitivity === 'medium' ? 0.7 : 0.5,
      detectionMethod: 'AI-Viewport-Analysis'
    }));
    
  } catch (error) {
    console.error('❌ Failed to parse viewport analysis response:', error);
    return [];
  }
}

function generateViewportHash(viewport, visibleDOM) {
  // Create hash based on viewport position and visible content
  const position = `${Math.round(viewport.scrollX / 200)}_${Math.round(viewport.scrollY / 200)}`;
  const contentSample = visibleDOM.replace(/\s+/g, '').substring(0, 500);
  return btoa(`${position}_${contentSample}`).slice(0, 20);
}

async function handleBatchDOMAnalysis(message, sendResponse) {
  try {
    const startTime = Date.now();
    console.log('📦 Batch DOM Analysis requested');
    console.log('📄 Total DOM size:', Math.round(message.fullDOM.length / 1024), 'KB');
    
    // Check if DOM is too large and needs batching
    const maxBatchSize = 40000; // 40KB per batch
    const domBatches = [];
    
    if (message.fullDOM.length > maxBatchSize) {
      console.log('🔄 DOM too large, splitting into batches...');
      domBatches.push(...splitDOMIntoBatches(message.fullDOM, maxBatchSize));
    } else {
      domBatches.push(message.fullDOM);
    }
    
    console.log('📦 Processing', domBatches.length, 'DOM batches');
    
    // Process all batches in parallel for speed
    const batchPromises = domBatches.map((batch, index) => 
      processDOMBatch(batch, index + 1, message)
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    // Combine results from all batches
    const allSensitiveFields = [];
    batchResults.forEach(result => {
      if (result && result.length > 0) {
        allSensitiveFields.push(...result);
      }
    });
    
    // Remove duplicates based on selector
    const uniqueFields = removeDuplicateFields(allSensitiveFields);
    
    const processingTime = Date.now() - startTime;
    
    console.log('✅ Batch analysis complete:', {
      totalBatches: domBatches.length,
      totalSensitiveFields: uniqueFields.length,
      processingTime: processingTime + 'ms'
    });
    
    sendResponse({ 
      success: true, 
      results: uniqueFields,
      processingTime: processingTime,
      batchCount: domBatches.length,
      domSize: message.fullDOM.length,
      method: 'batch-analysis'
    });
    
  } catch (error) {
    console.error('❌ Batch DOM Analysis failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

function splitDOMIntoBatches(fullDOM, maxSize) {
  const batches = [];
  
  // Try to split at logical boundaries (forms, sections)
  const logicalSplits = [
    /<\/form>/gi,
    /<\/section>/gi,
    /<\/div[^>]*class[^>]*form[^>]*>/gi,
    /<\/fieldset>/gi
  ];
  
  let remainingDOM = fullDOM;
  
  while (remainingDOM.length > maxSize) {
    let splitPoint = maxSize;
    
    // Try to find a logical split point before maxSize
    for (const splitRegex of logicalSplits) {
      const matches = [...remainingDOM.substring(0, maxSize).matchAll(splitRegex)];
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        splitPoint = lastMatch.index + lastMatch[0].length;
        break;
      }
    }
    
    // Extract batch
    const batch = remainingDOM.substring(0, splitPoint);
    batches.push(batch);
    
    // Remove processed content
    remainingDOM = remainingDOM.substring(splitPoint);
  }
  
  // Add remaining content
  if (remainingDOM.length > 0) {
    batches.push(remainingDOM);
  }
  
  console.log('📦 Split DOM into', batches.length, 'batches:', 
    batches.map(batch => Math.round(batch.length / 1024) + 'KB'));
  
  return batches;
}

async function processDOMBatch(domBatch, batchNumber, originalMessage) {
  try {
    console.log(`📦 Processing batch ${batchNumber}...`);
    
    const prompt = createBatchAnalysisPrompt({
      ...originalMessage,
      domBatch: domBatch,
      batchNumber: batchNumber
    });
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Batch ${batchNumber} API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Batch ${batchNumber} analysis complete`);
    
    return parseBatchAnalysisResponse(data, batchNumber);
    
  } catch (error) {
    console.error(`❌ Batch ${batchNumber} processing failed:`, error);
    return [];
  }
}

function createBatchAnalysisPrompt(message) {
  return `You are an AI expert in web security and sensitive data classification. Analyze this DOM batch and classify ALL form fields for sensitivity level.

PAGE CONTEXT:
- URL: ${message.pageURL}
- Page Title: ${message.pageTitle}
- Batch: ${message.batchNumber} (Complete analysis required)

DOM BATCH CONTENT:
${message.domBatch}

AI CLASSIFICATION TASK:
Analyze ALL form fields (input, textarea, select) and classify each by sensitivity:

🔴 HIGH SENSITIVITY - Immediate Security Risk:
- Passwords, passphrases, PINs, security codes
- 2FA tokens, OTP codes, authentication codes
- Credit card numbers, debit card numbers
- CVV/CVC codes, card expiration dates
- Social Security Numbers (SSN), Tax IDs
- Bank account numbers, routing numbers, IBAN
- Government ID numbers, passport numbers
- Security questions and answers

🟡 MEDIUM SENSITIVITY - Personal Identifiable Information:
- Email addresses, usernames, login IDs
- Full names, first names, last names
- Phone numbers, mobile numbers, fax numbers
- Home addresses, work addresses
- Postal codes, ZIP codes, area codes
- Date of birth, age, birth year

🟢 LOW SENSITIVITY - General Personal Data:
- Company names, organization names
- Job titles, professional information
- General preferences, settings
- Non-personal contact information

ADVANCED AI ANALYSIS:
1. Parse field attributes: name, id, class, placeholder, type, autocomplete
2. Analyze surrounding context: labels, headings, form structure
3. Understand page purpose: login, registration, payment, profile
4. Detect patterns: password confirmation, card number formatting
5. Identify field relationships: grouped personal info, payment flows
6. Consider regulatory compliance: GDPR, PCI-DSS, CCPA relevance

RESPONSE: Valid JSON Array Only:
[
  {
    "selector": "precise CSS selector (prefer #id or [name='value'])",
    "type": "exact input type",
    "sensitivity": "high|medium|low",
    "category": "password|financial|personal|contact|security|identification|authentication",
    "reason": "detailed AI analysis reasoning",
    "confidence": "AI confidence score 0.1-1.0",
    "fieldName": "name attribute",
    "fieldId": "id attribute",
    "aiAnalysis": "detailed field purpose analysis",
    "dataType": "what type of sensitive data this field collects",
    "riskLevel": "security risk assessment"
  }
]

Return [] if no sensitive fields in this batch.

Focus on ACCURACY and COMPREHENSIVE CLASSIFICATION. Every sensitive field must be identified.`;
}

function parseBatchAnalysisResponse(aiData, batchNumber) {
  try {
    const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`🔍 Batch ${batchNumber} Response:`, responseText.substring(0, 200) + '...');
    
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(`⚠️ Could not parse batch ${batchNumber} response as JSON`);
      return [];
    }
    
    const sensitiveFields = JSON.parse(jsonMatch[0]);
    console.log(`🎯 Batch ${batchNumber} found`, sensitiveFields.length, 'sensitive fields');
    
    return sensitiveFields.filter(field => {
      return field.selector && field.type && field.category && field.reason;
    }).map(field => ({
      ...field,
      confidence: field.sensitivity === 'high' ? 0.9 : field.sensitivity === 'medium' ? 0.7 : 0.5,
      detectionMethod: 'AI-Batch-Analysis',
      batchNumber: batchNumber
    }));
    
  } catch (error) {
    console.error(`❌ Failed to parse batch ${batchNumber} response:`, error);
    return [];
  }
}

function removeDuplicateFields(allFields) {
  const uniqueFields = [];
  const seenSelectors = new Set();
  
  allFields.forEach(field => {
    // Use selector as unique identifier
    const uniqueKey = field.selector.toLowerCase();
    
    if (!seenSelectors.has(uniqueKey)) {
      seenSelectors.add(uniqueKey);
      uniqueFields.push(field);
    } else {
      // If duplicate, keep the one with higher confidence
      const existingIndex = uniqueFields.findIndex(f => 
        f.selector.toLowerCase() === uniqueKey);
      
      if (existingIndex >= 0 && field.confidence > uniqueFields[existingIndex].confidence) {
        uniqueFields[existingIndex] = field;
      }
    }
  });
  
  console.log('🔄 Removed', allFields.length - uniqueFields.length, 'duplicate fields');
  return uniqueFields;
}

async function handleCompleteDOMAnalysis(message, sendResponse) {
  try {
    const startTime = Date.now();
    console.log('🌍 Complete DOM Analysis requested');
    console.log('📄 Complete DOM size:', Math.round(message.completeDOM.length / 1024), 'KB');
    console.log('🏷️ Page type:', message.pageType);
    
    // Analyze complete DOM with Gemini
    const analysis = await analyzeCompleteDOMWithGemini(
      message.completeDOM, 
      message.pageType
    );
    
    if (analysis && analysis.sensitiveFields) {
      const processingTime = Date.now() - startTime;
      console.log('✅ Complete DOM analysis completed in', processingTime, 'ms');
      console.log('🎯 Found', analysis.sensitiveFields.length, 'sensitive fields');
      
      sendResponse({
        success: true,
        sensitiveFields: analysis.sensitiveFields,
        processingTime: processingTime,
        pageType: message.pageType
      });
    } else {
      console.log('⚠️ No sensitive fields found in complete DOM');
      sendResponse({
        success: true,
        sensitiveFields: [],
        processingTime: Date.now() - startTime,
        pageType: message.pageType
      });
    }
  } catch (error) {
    console.error('❌ Complete DOM analysis failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function handleDOMAnalysis(message, sendResponse) {
  try {
    const startTime = Date.now();
    console.log('🌐 DOM Analysis requested for:', message.pageTitle);
    console.log('📄 DOM size:', Math.round(message.domHTML.length / 1024), 'KB');
    console.log('🔍 Form elements to analyze:', message.formElements.length);
    
    // Check if we've already analyzed a similar DOM structure
    const domHash = generateDOMHash(message.domHTML, message.pageURL);
    
    if (processedElements.has(domHash)) {
      console.log('⏭️ Similar DOM already analyzed, skipping');
      sendResponse({ success: true, results: [], processingTime: 0, cached: true });
      return;
    }
    
    // Mark this DOM as processed
    processedElements.add(domHash);
    
    const aiResults = await callGeminiForDOM(message);
    const processingTime = Date.now() - startTime;
    
    sendResponse({ 
      success: true, 
      results: aiResults,
      processingTime: processingTime,
      domSize: message.domHTML.length,
      formElementsCount: message.formElements.length
    });
    
  } catch (error) {
    console.error('❌ DOM Analysis failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function callGeminiForDOM(message) {
  const prompt = createDOMAnalysisPrompt(message);
  
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };
  
  console.log('🚀 Sending DOM to Gemini API...');
  
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('✅ Gemini DOM analysis response received');
  
  return parseDOMAnalysisResponse(data, message.formElements);
}

function createDOMAnalysisPrompt(message) {
  return `Analyze this complete web page DOM and identify ALL SENSITIVE form fields that could contain personal, financial, or security data.

PAGE CONTEXT:
- URL: ${message.pageURL}
- Title: ${message.pageTitle}
- Form Elements Found: ${message.formElements.length}

COMPLETE DOM STRUCTURE:
${message.domHTML}

SENSITIVE FIELD TYPES TO DETECT:
- Passwords, PINs, security codes, OTP fields
- Email addresses, usernames, login IDs
- Credit card numbers, CVV, expiry dates
- Social security numbers, tax IDs, government IDs
- Phone numbers, addresses, postal codes
- Bank account numbers, routing numbers
- Personal names (first, last, full name)
- Birthdates, ages
- Any authentication or security-related fields
- Financial account information
- Personal identification numbers

INSTRUCTIONS:
1. Read the complete DOM structure and understand the page context
2. Identify form fields (input, textarea, select elements) that are likely to contain sensitive data
3. Look for contextual clues like:
   - Field labels and surrounding text
   - CSS class names and IDs
   - Placeholder text
   - Autocomplete attributes
   - Field positioning and grouping
   - Form purpose and page context

RESPONSE FORMAT:
Respond with ONLY a JSON array containing objects for each sensitive field found:
[
  {
    "selector": "CSS selector to uniquely identify the field",
    "type": "field type (password, email, text, etc.)",
    "sensitivity": "high|medium|low",
    "category": "password|username|financial|personal|contact|security",
    "reason": "Brief explanation why this field is sensitive",
    "name": "field name attribute if available",
    "id": "field id attribute if available"
  }
]

If no sensitive fields are found, respond with: []

Example response:
[
  {
    "selector": "#password",
    "type": "password",
    "sensitivity": "high",
    "category": "password",
    "reason": "Password input field for authentication",
    "name": "password",
    "id": "password"
  },
  {
    "selector": "input[name='email']",
    "type": "email",
    "sensitivity": "medium",
    "category": "contact",
    "reason": "Email address for user identification",
    "name": "email",
    "id": ""
  }
]`;
}

function parseDOMAnalysisResponse(aiData, formElements) {
  try {
    const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('🔍 DOM Analysis Response:', responseText.substring(0, 500) + '...');
    
    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('⚠️ Could not parse DOM analysis response as JSON');
      return [];
    }
    
    const sensitiveFields = JSON.parse(jsonMatch[0]);
    console.log('🎯 AI identified', sensitiveFields.length, 'sensitive fields in DOM');
    
    // Validate and process results
    return sensitiveFields.filter(field => {
      return field.selector && field.type && field.category && field.reason;
    }).map(field => ({
      ...field,
      confidence: field.sensitivity === 'high' ? 0.9 : field.sensitivity === 'medium' ? 0.7 : 0.5,
      detectionMethod: 'AI-DOM-Analysis'
    }));
    
  } catch (error) {
    console.error('❌ Failed to parse DOM analysis response:', error);
    return [];
  }
}

function generateDOMHash(domHTML, pageURL) {
  // Create a hash based on DOM structure and URL to avoid re-analyzing similar pages
  const domStructure = domHTML.replace(/\s+/g, '').substring(0, 1000); // Simplified structure
  const urlBase = pageURL.split('?')[0]; // Remove query parameters
  return btoa(`${urlBase}_${domStructure}`).slice(0, 20);
}

async function callGeminiAPI(elements) {
  const prompt = createSensitiveFieldPrompt(elements);
  
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };
  
  console.log('🚀 Sending request to Gemini API...');
  
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('✅ Gemini API response received');
  
  return parseAIResponse(data, elements);
}

async function callGeminiAPIForCompletePageAnalysis(prompt) {
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 0.8,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ]
  };
  
  console.log('🚀 Sending complete page analysis to Gemini API...');
  
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Gemini API response received');
    
    return {
      success: true,
      data: data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    };
    
  } catch (error) {
    console.error('❌ Complete page analysis failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function createSensitiveFieldPrompt(elements) {
  const elementsText = elements.map((element, index) => 
    `${index + 1}. Type: ${element.type}, Name: "${element.name}", ID: "${element.id}", Placeholder: "${element.placeholder}", Autocomplete: "${element.autocomplete}"`
  ).join('\n');
  
  return `Analyze these form fields and identify which ones are SENSITIVE (contain personal, financial, or security data):

${elementsText}

SENSITIVE field types include:
- Passwords, PINs, security codes
- Email addresses, usernames
- Credit card numbers, CVV, expiry dates
- Social security numbers, tax IDs
- Phone numbers, addresses
- Bank account numbers
- Personal names, birthdates
- Any field with security/authentication purpose

Respond with ONLY a JSON array of numbers (1-based indices) for SENSITIVE fields.
Example: [1, 3, 5] means fields 1, 3, and 5 are sensitive.
If no fields are sensitive, respond with: []`;
}

function parseAIResponse(aiData, elements) {
  try {
    const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('🔍 AI Response:', responseText);
    
    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[([\d,\s]*)\]/);
    if (!jsonMatch) {
      console.warn('⚠️ Could not parse AI response as JSON array');
      return [];
    }
    
    const sensitiveIndices = JSON.parse(jsonMatch[0]);
    console.log('🎯 AI identified sensitive fields at indices:', sensitiveIndices);
    
    // Convert indices to results with element info
    return sensitiveIndices.map(index => ({
      index: index,
      element: elements[index - 1], // Convert to 0-based
      confidence: 0.9, // High confidence from AI
      reason: 'AI-detected sensitive field'
    })).filter(result => result.element); // Filter out invalid indices
    
  } catch (error) {
    console.error('❌ Failed to parse AI response:', error);
    return [];
  }
}

async function analyzeCompleteDOMWithGemini(completeDOM, pageType) {
  console.log('🤖 Analyzing complete DOM with Gemini...');
  
  const prompt = `
You are an expert web security analyst specializing in sensitive field detection. Analyze the complete DOM structure below and identify ALL sensitive input fields that could contain personal, financial, or confidential information.

Page Type: ${pageType}
DOM Structure:
${completeDOM}

IMPORTANT INSTRUCTIONS:
1. Look for ALL input fields, textareas, select elements, and any interactive elements
2. Consider the context: labels, placeholders, names, IDs, surrounding text
3. Identify fields that could contain: passwords, emails, phone numbers, SSN, credit card info, addresses, names, dates of birth, security codes, PINs, account numbers, etc.
4. Pay special attention to dynamically generated fields and fields without obvious names
5. Consider hidden or initially invisible fields that may become visible later
6. For banking/financial sites, be extra thorough with transaction and authentication fields

Respond with a JSON array of objects, each containing:
{
  "selector": "CSS selector to uniquely identify the element",
  "type": "password|email|phone|ssn|credit_card|address|name|date_of_birth|security_code|pin|account_number|other",
  "confidence": 0.0-1.0,
  "reasoning": "why this field is considered sensitive",
  "context": "surrounding labels/text that helped identify it"
}

Return ONLY the JSON array, no other text.`;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.1,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    }
  };

  try {
    console.log('📤 Sending complete DOM to Gemini API...');
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.log('⚠️ Primary endpoint failed, trying alternative...');
      return await callGeminiAlternativeEndpoint(requestBody, 'CompleteDOM');
    }

    const data = await response.json();
    console.log('📥 Gemini complete DOM response received');

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const responseText = data.candidates[0].content.parts[0].text;
      console.log('🔍 Gemini complete DOM analysis:', responseText.substring(0, 500));
      
      try {
        const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
        const sensitiveFields = JSON.parse(cleanedResponse);
        
        if (Array.isArray(sensitiveFields)) {
          console.log('✅ Successfully parsed', sensitiveFields.length, 'sensitive fields from complete DOM');
          return { sensitiveFields };
        } else {
          console.log('⚠️ Response not an array:', sensitiveFields);
          return { sensitiveFields: [] };
        }
      } catch (parseError) {
        console.error('❌ Failed to parse complete DOM response:', parseError);
        console.log('📝 Raw response:', responseText);
        return { sensitiveFields: [] };
      }
    } else {
      console.log('⚠️ No content in complete DOM response');
      return { sensitiveFields: [] };
    }
  } catch (error) {
    console.error('❌ Complete DOM analysis failed:', error);
    return { sensitiveFields: [] };
  }
}

async function testGeminiAPI(sendResponse) {
  try {
    console.log('🧪 Testing Gemini API connection...');
    
    const testPrompt = 'Respond with just the word "CONNECTED" if you can read this message.';
    const requestBody = {
      contents: [{
        parts: [{
          text: testPrompt
        }]
      }]
    };
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      console.log('✅ API test successful');
      sendResponse({ success: true, valid: true });
    } else {
      console.error('❌ API test failed:', response.status);
      sendResponse({ success: true, valid: false });
    }
  } catch (error) {
    console.error('❌ API test error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

function generateElementHash(element) {
  // Create unique hash for element to avoid duplicates
  return `${element.type}_${element.name}_${element.id}_${element.placeholder}`.toLowerCase();
}

async function callGeminiAlternativeEndpoint(requestBody, analysisType) {
  const alternativeEndpoints = [
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
  ];
  
  for (const endpoint of alternativeEndpoints) {
    try {
      console.log('🔄 Trying alternative endpoint:', endpoint);
      
      const response = await fetch(`${endpoint}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Alternative endpoint successful');
        
        if (analysisType === 'viewport') {
          return parseViewportAnalysisResponse(data);
        } else if (analysisType === 'batch') {
          return parseBatchAnalysisResponse(data, 1);
        }
      }
    } catch (error) {
      console.warn('⚠️ Alternative endpoint failed:', endpoint, error.message);
    }
  }
  
  throw new Error('All Gemini endpoints failed');
}

function performFallbackPatternClassification(domContent) {
  console.log('🎯 Performing enhanced pattern-based classification...');
  
  const sensitiveFields = [];
  
  // Create a temporary DOM element to parse the content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = domContent;
  
  const formFields = tempDiv.querySelectorAll('input, textarea, select');
  
  formFields.forEach((field, index) => {
    const classification = classifyFieldByPattern(field);
    
    if (classification.isSensitive) {
      sensitiveFields.push({
        selector: generateFieldSelector(field),
        type: field.type || 'text',
        sensitivity: classification.sensitivity,
        category: classification.category,
        reason: classification.reason,
        fieldName: field.name || '',
        fieldId: field.id || '',
        placeholder: field.placeholder || '',
        context: getFieldContext(field),
        confidence: classification.confidence,
        detectionMethod: 'Enhanced-Pattern-Based'
      });
    }
  });
  
  console.log('✅ Pattern classification found', sensitiveFields.length, 'sensitive fields');
  return sensitiveFields;
}

function classifyFieldByPattern(field) {
  const fieldText = [
    field.type || '',
    field.name || '',
    field.id || '',
    field.placeholder || '',
    field.className || '',
    field.autocomplete || '',
    getFieldLabel(field)
  ].join(' ').toLowerCase();
  
  // High sensitivity patterns
  const highSensitivityPatterns = {
    password: /password|passwd|pwd|pass|secret|pin|code|otp|2fa|mfa|auth/i,
    financial: /card|credit|debit|cvv|cvc|ccv|expir|expire|bank|account|routing|iban|sort/i,
    ssn: /ssn|social.?security|tax.?id|ein|national.?id|gov.?id/i,
    security: /security|answer|question|challenge|verify|confirm/i
  };
  
  // Medium sensitivity patterns
  const mediumSensitivityPatterns = {
    personal: /name|first|last|full.?name|surname|given/i,
    contact: /email|mail|phone|mobile|tel|address|street|city|zip|postal|country/i,
    identification: /username|user.?id|login|signin|account.?id|member.?id/i,
    birth: /birth|age|dob|date.?of.?birth|born/i
  };
  
  // Check high sensitivity
  for (const [category, pattern] of Object.entries(highSensitivityPatterns)) {
    if (pattern.test(fieldText) || field.type === 'password') {
      return {
        isSensitive: true,
        sensitivity: 'high',
        category: category,
        reason: `High sensitivity ${category} field detected`,
        confidence: 0.9
      };
    }
  }
  
  // Check medium sensitivity
  for (const [category, pattern] of Object.entries(mediumSensitivityPatterns)) {
    if (pattern.test(fieldText)) {
      return {
        isSensitive: true,
        sensitivity: 'medium',
        category: category,
        reason: `Medium sensitivity ${category} field detected`,
        confidence: 0.8
      };
    }
  }
  
  // Special email type check
  if (field.type === 'email') {
    return {
      isSensitive: true,
      sensitivity: 'medium',
      category: 'contact',
      reason: 'Email input field detected',
      confidence: 0.95
    };
  }
  
  return { isSensitive: false };
}

function generateFieldSelector(field) {
  if (field.id) {
    return `#${field.id}`;
  }
  if (field.name) {
    return `input[name="${field.name}"]`;
  }
  if (field.type && field.type !== 'text') {
    return `input[type="${field.type}"]`;
  }
  return `input:nth-of-type(${Array.from(field.parentNode.querySelectorAll('input')).indexOf(field) + 1})`;
}

function getFieldLabel(field) {
  // Look for associated label
  if (field.labels && field.labels.length > 0) {
    return field.labels[0].textContent || '';
  }
  
  // Look for nearby label
  const label = field.parentNode.querySelector('label');
  if (label) {
    return label.textContent || '';
  }
  
  // Look for previous text content
  const prevElement = field.previousElementSibling;
  if (prevElement && prevElement.textContent) {
    return prevElement.textContent.trim();
  }
  
  return '';
}

console.log('✅ Background script ready with enhanced AI classification');
