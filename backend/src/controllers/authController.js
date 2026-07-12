import jwt from 'jsonwebtoken';

export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    if (username !== adminUser || password !== adminPass) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { username, role: 'admin' },
      process.env.JWT_SECRET || 'valma_dev_secret_change_in_production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      user: { username, role: 'admin' },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}
