import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  clientOrigin: process.env.CLIENT_URL || 'http://localhost:3000',
};
