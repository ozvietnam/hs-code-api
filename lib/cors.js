function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

module.exports = { setCors, handleOptions };
