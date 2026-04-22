const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'codeduel';

// Pool starts as null — assigned after DB is created
let pool = null;

async function initDB() {
  // ── Step 1: connect WITHOUT a database to create it ──
  const bootstrap = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await bootstrap.end();
  console.log(`✅ Database "${DB_NAME}" ready`);

  // ── Step 2: now create pool pointing at the database ──
  pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               process.env.DB_PORT     || 3306,
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    database:           DB_NAME,
    waitForConnections: true,
    connectionLimit:    10,
  });

  // ── Step 3: create tables ─────────────────────────────
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            INT PRIMARY KEY AUTO_INCREMENT,
        username      VARCHAR(50)  UNIQUE NOT NULL,
        email         VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        elo           INT     DEFAULT 1000,
        wins          INT     DEFAULT 0,
        losses        INT     DEFAULT 0,
        avatar_color  VARCHAR(7)  DEFAULT '#c8a97e',
        created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS problems (
        id                  INT PRIMARY KEY AUTO_INCREMENT,
        title               VARCHAR(200) NOT NULL,
        description         TEXT         NOT NULL,
        difficulty          ENUM('easy','medium','hard') NOT NULL,
        examples            JSON NOT NULL,
        test_cases          JSON NOT NULL,
        starter_code_js     TEXT,
        starter_code_python TEXT,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id         INT PRIMARY KEY AUTO_INCREMENT,
        room_code  VARCHAR(10) UNIQUE NOT NULL,
        problem_id INT,
        status     ENUM('waiting','active','finished') DEFAULT 'waiting',
        difficulty ENUM('easy','medium','hard')        DEFAULT 'easy',
        winner_id  INT,
        time_limit INT       DEFAULT 1800,
        started_at TIMESTAMP NULL,
        ended_at   TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (problem_id) REFERENCES problems(id),
        FOREIGN KEY (winner_id)  REFERENCES users(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS match_players (
        match_id       INT NOT NULL,
        user_id        INT NOT NULL,
        submitted_code TEXT,
        language       VARCHAR(20) DEFAULT 'javascript',
        tests_passed   INT DEFAULT 0,
        tests_total    INT DEFAULT 0,
        elo_change     INT DEFAULT 0,
        finished_at    TIMESTAMP NULL,
        PRIMARY KEY (match_id, user_id),
        FOREIGN KEY (match_id) REFERENCES matches(id),
        FOREIGN KEY (user_id)  REFERENCES users(id)
      )
    `);

    // Seed problems if table is empty
    const [rows] = await conn.query('SELECT COUNT(*) AS cnt FROM problems');
    if (rows[0].cnt === 0) {
      await seedProblems(conn);
      console.log('✅ Problems seeded');
    }

    console.log('✅ All tables ready');
  } finally {
    conn.release();
  }
}

// Routes call getPool() to get the connection pool
function getPool() {
  if (!pool) throw new Error('DB not initialised — call initDB() first');
  return pool;
}

async function seedProblems(conn) {
  const problems = [
    {
      title: 'Two Sum',
      description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to target.\n\nYou may assume each input has exactly one solution, and you may not use the same element twice.`,
      difficulty: 'easy',
      examples: JSON.stringify([
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] = 9' },
        { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
      ]),
      test_cases: JSON.stringify([
        { input: '[2,7,11,15]\n9', expected: '[0,1]' },
        { input: '[3,2,4]\n6',     expected: '[1,2]' },
        { input: '[3,3]\n6',       expected: '[0,1]' },
        { input: '[1,2,3,4,5]\n9', expected: '[3,4]' },
      ]),
      starter_code_js:     `function twoSum(nums, target) {\n  // your code here\n}`,
      starter_code_python: `def twoSum(nums, target):\n    # your code here\n    pass`,
    },
    {
      title: 'Reverse String',
      description: `Write a function that reverses a string. The input string is given as an array of characters \`s\`. Modify the input array in-place with O(1) extra memory.`,
      difficulty: 'easy',
      examples: JSON.stringify([
        { input: 's = ["h","e","l","l","o"]',     output: '["o","l","l","e","h"]' },
        { input: 's = ["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]' },
      ]),
      test_cases: JSON.stringify([
        { input: '["h","e","l","l","o"]',     expected: '["o","l","l","e","h"]' },
        { input: '["H","a","n","n","a","h"]', expected: '["h","a","n","n","a","H"]' },
        { input: '["a"]',                     expected: '["a"]' },
      ]),
      starter_code_js:     `function reverseString(s) {\n  // your code here\n}`,
      starter_code_python: `def reverseString(s):\n    # your code here\n    pass`,
    },
    {
      title: 'Valid Parentheses',
      description: `Given a string \`s\` containing just the characters \`(\`, \`)\`, \`{\`, \`}\`, \`[\` and \`]\`, determine if the input string is valid.\n\nOpen brackets must be closed by the same type of brackets in the correct order.`,
      difficulty: 'medium',
      examples: JSON.stringify([
        { input: 's = "()"',     output: 'true' },
        { input: 's = "()[]{}"', output: 'true' },
        { input: 's = "(]"',     output: 'false' },
      ]),
      test_cases: JSON.stringify([
        { input: '()',      expected: 'true' },
        { input: '()[]{}', expected: 'true' },
        { input: '(]',     expected: 'false' },
        { input: '([)]',   expected: 'false' },
        { input: '{[]}',   expected: 'true' },
      ]),
      starter_code_js:     `function isValid(s) {\n  // your code here\n}`,
      starter_code_python: `def isValid(s):\n    # your code here\n    pass`,
    },
    {
      title: 'Maximum Subarray',
      description: `Given an integer array \`nums\`, find the subarray with the largest sum and return its sum (Kadane's Algorithm).`,
      difficulty: 'medium',
      examples: JSON.stringify([
        { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: '[4,-1,2,1] has sum 6' },
        { input: 'nums = [1]',         output: '1' },
        { input: 'nums = [5,4,-1,7,8]', output: '23' },
      ]),
      test_cases: JSON.stringify([
        { input: '[-2,1,-3,4,-1,2,1,-5,4]', expected: '6'  },
        { input: '[1]',                      expected: '1'  },
        { input: '[5,4,-1,7,8]',             expected: '23' },
        { input: '[-1,-2,-3]',              expected: '-1' },
      ]),
      starter_code_js:     `function maxSubArray(nums) {\n  // your code here\n}`,
      starter_code_python: `def maxSubArray(nums):\n    # your code here\n    pass`,
    },
  ];

  for (const p of problems) {
    await conn.query(
      `INSERT INTO problems
         (title, description, difficulty, examples, test_cases, starter_code_js, starter_code_python)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p.title, p.description, p.difficulty, p.examples, p.test_cases,
       p.starter_code_js, p.starter_code_python]
    );
  }
}

module.exports = { getPool, initDB };
