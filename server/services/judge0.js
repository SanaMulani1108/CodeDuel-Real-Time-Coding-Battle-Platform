const axios = require('axios');

// Language IDs for Judge0
const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
};

async function executeCode(code, language, stdin) {
  const languageId = LANGUAGE_IDS[language] || 63;

  const options = {
    method: 'POST',
    url: `${process.env.JUDGE0_BASE_URL}/submissions`,
    params: { base64_encoded: 'false', wait: 'true' },
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
    },
    data: {
      source_code: code,
      language_id: languageId,
      stdin: stdin || '',
      cpu_time_limit: 5,
      memory_limit: 128000,
    },
  };

  const response = await axios.request(options);
  return response.data;
}

// Wrap JS code so it reads from stdin and calls the function
function wrapJSCode(userCode, testInput) {
  return `
${userCode}

const lines = \`${testInput}\`.split('\\n').map(l => l.trim()).filter(Boolean);
try {
  // Auto-detect function name
  const fnMatch = ${JSON.stringify(userCode)}.match(/function\\s+(\\w+)/);
  if (!fnMatch) { console.log('ERROR: No function found'); process.exit(1); }
  const fnName = fnMatch[1];
  const args = lines.map(l => { try { return JSON.parse(l); } catch(e) { return l; } });
  const result = eval(fnName)(...args);
  console.log(JSON.stringify(result));
} catch(e) {
  console.error(e.message);
}
`;
}

async function runTestCases(code, language, testCases) {
  const results = [];

  for (const tc of testCases) {
    try {
      let wrappedCode = code;
      if (language === 'javascript') {
        wrappedCode = wrapJSCode(code, tc.input);
      }

      const result = await executeCode(wrappedCode, language, tc.input);

      const actual = (result.stdout || '').trim();
      const expected = tc.expected.toString().trim();

      let passed = false;
      try {
        passed = JSON.stringify(JSON.parse(actual)) === JSON.stringify(JSON.parse(expected));
      } catch {
        passed = actual === expected;
      }

      results.push({
        input: tc.input,
        expected,
        actual,
        passed,
        time: result.time,
        error: result.stderr || result.compile_output || null,
        status: result.status?.description || 'Unknown',
      });
    } catch (err) {
      results.push({
        input: tc.input,
        expected: tc.expected,
        actual: null,
        passed: false,
        error: err.message,
        status: 'API Error',
      });
    }
  }

  return results;
}

module.exports = { runTestCases, executeCode };
