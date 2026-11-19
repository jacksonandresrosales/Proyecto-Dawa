import { app } from './app.js';
import { validateEnvironment } from './config/env.js';

const { PORT: port } = validateEnvironment();
app.listen(port, () => console.log(`API en http://localhost:${port}/api`));
