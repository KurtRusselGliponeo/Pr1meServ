import 'dotenv/config';

import { validateRequiredConstraints } from './validation';

async function run() {
  const result = await validateRequiredConstraints();

  console.log(JSON.stringify(result, null, 2));

  if (result.status !== 'ok') {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
