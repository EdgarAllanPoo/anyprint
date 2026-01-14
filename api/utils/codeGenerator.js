async function generateUniqueNumericCode(pool, length = 8) {
  while (true) {
    let code = "";
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10);
    }

    const { rows } = await pool.query(
      "SELECT 1 FROM jobs WHERE code = $1",
      [code]
    );

    if (rows.length === 0) return code;
  }
}

module.exports = {
  generateUniqueNumericCode
};
