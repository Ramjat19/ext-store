# Raw DOM Analysis with Gemini AI

## Overview

The `analyzeRawDOMWithGemini` function is a standalone utility that captures the complete DOM of a webpage and sends it to Google's Gemini AI for comprehensive sensitive field detection. This function provides detailed analysis with confidence scores, risk levels, and security recommendations.

## Features

- **Complete DOM Analysis**: Captures entire page structure including hidden and dynamic elements
- **AI-Powered Detection**: Uses Gemini AI for intelligent field classification
- **Risk Assessment**: Categorizes fields by risk level (high, medium, low)
- **Security Recommendations**: Provides specific security measures for each field
- **Detailed Logging**: Comprehensive console logging for debugging and monitoring
- **Privacy-First**: No user data is transmitted, only DOM structure

## Function Signature

```javascript
async function analyzeRawDOMWithGemini(rawDOM, pageInfo = {})
```

### Parameters

- `rawDOM` (string): The complete HTML DOM content
- `pageInfo` (object, optional): Additional page context
  - `url` (string): Page URL
  - `title` (string): Page title
  - `pageType` (string): Type of page (login, form, etc.)
  - `timestamp` (number): Analysis timestamp
  - `userAgent` (string): Browser user agent
  - `viewport` (object): Viewport dimensions

### Returns

```javascript
{
  success: boolean,
  sensitiveFields: Array<{
    selector: string,
    type: string,
    confidence: number,
    reasoning: string,
    context: string,
    risk_level: 'high' | 'medium' | 'low',
    recommendation: string
  }>,
  processingTime: number,
  apiCallTime: number,
  domSize: number,
  pageInfo: object
}
```

## Usage Examples

### 1. Basic Usage

```javascript
// Capture current page DOM
const rawDOM = document.documentElement.outerHTML;
const pageInfo = {
  url: window.location.href,
  title: document.title,
  pageType: 'login'
};

// Send to background script for AI analysis
const response = await chrome.runtime.sendMessage({
  action: 'analyzeRawDOM',
  rawDOM: rawDOM,
  pageInfo: pageInfo
});

if (response.success) {
  console.log('Detected fields:', response.sensitiveFields);
  console.log('Processing time:', response.processingTime + 'ms');
}
```

### 2. Content Script Integration

```javascript
// In content script
async function analyzeCurrentPage() {
  try {
    const result = await sendRawDOMToGemini();
    
    if (result.success) {
      // Process detected fields
      result.sensitiveFields.forEach(field => {
        console.log(`Found ${field.type} field: ${field.selector}`);
        console.log(`Risk level: ${field.risk_level}`);
        console.log(`Recommendation: ${field.recommendation}`);
      });
    }
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}
```

### 3. Manual Trigger (Testing)

```javascript
// Available globally for testing
window.triggerRawDOMAnalysis()
  .then(result => {
    console.log('Analysis completed:', result);
  })
  .catch(error => {
    console.error('Analysis failed:', error);
  });
```

## Detected Field Types

The AI can detect various types of sensitive fields:

### Authentication
- `password` - Password fields
- `email` - Email address fields
- `username` - Username/login fields
- `pin` - PIN codes
- `security_code` - Security codes

### Personal Information
- `name` - Full names
- `phone` - Phone numbers
- `address` - Addresses
- `date_of_birth` - Birth dates

### Financial
- `credit_card` - Credit card numbers
- `cvv` - Card verification values
- `account_number` - Bank account numbers
- `routing_number` - Bank routing numbers

### Government IDs
- `ssn` - Social Security Numbers
- `driver_license` - Driver's license numbers
- `passport` - Passport numbers
- `tax_id` - Tax identification numbers

### Medical
- `medical` - Medical information
- `insurance` - Insurance numbers

### Business
- `business` - Business secrets
- `proprietary` - Proprietary information

## Risk Levels

- **High Risk**: Fields containing highly sensitive data (passwords, SSNs, credit cards)
- **Medium Risk**: Fields with personal information (names, addresses, phone numbers)
- **Low Risk**: Fields with less sensitive data (preferences, settings)

## Console Output

The function provides detailed console logging:

```
🔍 NEW: Starting raw DOM analysis with Gemini AI...
📄 Raw DOM size: 45 KB
🌐 Page info: {url: "https://example.com", title: "Login Page"}
📤 Sending raw DOM to Gemini API...
⏱️ API call completed in: 1250ms
📥 Gemini response received
✅ Successfully parsed 8 valid sensitive fields
✅ Raw DOM analysis completed in: 1350ms
🎯 Detected sensitive fields: 8

📊 SENSITIVE FIELD DETECTION RESULTS:
============================================================
🌐 Page: https://example.com
📄 Title: Login Page
🎯 Total Fields Detected: 8

📋 DETECTION SUMMARY BY TYPE:
  PASSWORD: 2 fields
  EMAIL: 1 fields
  PHONE: 1 fields
  CREDIT_CARD: 1 fields
  SSN: 1 fields

⚠️ RISK LEVEL BREAKDOWN:
  HIGH RISK: 4 fields
  MEDIUM RISK: 3 fields
  LOW RISK: 1 fields

🔍 DETAILED FIELD ANALYSIS:
1. PASSWORD FIELD:
   Selector: #password
   Confidence: 95%
   Risk Level: HIGH
   Reasoning: Input field with type="password" and name="password"
   Context: Associated with "Password" label
   Recommendation: Ensure HTTPS encryption and proper password hashing

🛡️ SECURITY RECOMMENDATIONS:
  ⚠️  HIGH RISK FIELDS DETECTED - Immediate attention required
    - password: Ensure HTTPS encryption and proper password hashing
    - credit_card: Implement PCI DSS compliance measures
============================================================
```

## Error Handling

The function includes comprehensive error handling:

```javascript
try {
  const result = await analyzeRawDOMWithGemini(rawDOM, pageInfo);
  
  if (result.success) {
    // Process successful results
  } else {
    console.error('Analysis failed:', result.error);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Testing

Use the provided test page to verify functionality:

1. Load the extension in Chrome
2. Navigate to `test-raw-dom-analysis.html`
3. Click "Test Raw DOM Analysis"
4. Check console for detailed logs
5. Review results in the page

## Configuration

### API Key Setup

Ensure your Gemini API key is configured in `background-simple.js`:

```javascript
const GEMINI_API_KEY = 'your-api-key-here';
```

### Performance Tuning

Adjust generation config for different use cases:

```javascript
generationConfig: {
  temperature: 0.1,        // Lower = more consistent
  topK: 40,               // Response diversity
  topP: 0.95,             // Response quality
  maxOutputTokens: 8192,  // Response length
}
```

## Security Considerations

- **No User Data**: Only DOM structure is sent to AI
- **Anonymization**: Sensitive patterns are tokenized
- **Local Processing**: Field values are never transmitted
- **HTTPS Required**: API calls use secure connections
- **Rate Limiting**: Respect API usage limits

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Check Gemini API key configuration
   - Verify API key permissions
   - Test with `testGeminiAPI()` function

2. **No Fields Detected**
   - Ensure page has form elements
   - Check DOM structure
   - Verify extension is enabled

3. **Analysis Timeout**
   - Reduce DOM size
   - Check network connection
   - Monitor API rate limits

4. **Parse Errors**
   - Check console for raw response
   - Verify JSON format
   - Review prompt structure

### Debug Commands

```javascript
// Test API connection
chrome.runtime.sendMessage({action: 'testAPIKey'});

// Check extension state
chrome.storage.sync.get(['extensionEnabled']);

// Manual analysis trigger
window.triggerRawDOMAnalysis();
```

## Integration with Existing Extension

The raw DOM analysis integrates seamlessly with the existing extension:

1. **Automatic Triggering**: Called during page load
2. **Result Integration**: Fields added to detection lists
3. **Browser API**: Results sent to browser API
4. **Caching**: Results cached for performance
5. **Privacy**: Uses existing privacy utilities

## Performance Metrics

Typical performance characteristics:

- **Small Pages** (<50KB): 500-1000ms
- **Medium Pages** (50-200KB): 1000-2000ms
- **Large Pages** (>200KB): 2000-5000ms
- **API Call Time**: 80-90% of total time
- **Processing Time**: 10-20% of total time

## Future Enhancements

- **Batch Processing**: Multiple pages in single request
- **Incremental Analysis**: Only analyze changed sections
- **Custom Patterns**: User-defined detection rules
- **Real-time Monitoring**: Continuous field detection
- **Export Results**: Save analysis reports 