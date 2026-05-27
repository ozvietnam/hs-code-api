function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

function requireAuth(req, res) {
  const expected = process.env.HS_API_TOKEN;
  if (!expected) {
    res.status(503).json({
      error: 'Service misconfigured',
      detail: 'HS_API_TOKEN is not set on the server',
    });
    return true;
  }

  const token = getBearerToken(req);
  if (!token || token !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return true;
  }

  return false;
}

function isApiTokenConfigured() {
  return Boolean(process.env.HS_API_TOKEN);
}

module.exports = { requireAuth, getBearerToken, isApiTokenConfigured };
