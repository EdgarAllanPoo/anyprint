exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (
    username !== process.env.ADMIN_USER ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  req.session.admin = {
    username,
  };

  res.json({ success: true });
};

exports.logout = async (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("anyprint_admin_session");
    res.json({ success: true });
  });
};

exports.me = async (req, res) => {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.json({ user: req.session.admin });
};
