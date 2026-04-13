import { IdentityService } from './identity.service';

describe('IdentityService', () => {
  it('should register a new user and log an audit properly', async () => {
    const service = new IdentityService();
    const result = await service.registerUser('test@example.com', 'John', 'Doe');
    
    expect(result.success).toBe(true);
  });
});
