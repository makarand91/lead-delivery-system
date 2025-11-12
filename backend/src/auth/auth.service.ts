import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

@Injectable()
export class AuthService {
  private verifier: any;

  constructor(private configService: ConfigService) {
    const userPoolId = this.configService.get('USER_POOL_ID');
    const clientId = this.configService.get('USER_POOL_CLIENT_ID');

    if (userPoolId && clientId) {
      this.verifier = CognitoJwtVerifier.create({
        userPoolId,
        tokenUse: 'access',
        clientId,
      });
    }
  }

  async verifyToken(token: string): Promise<any> {
    try {
      if (!this.verifier) {
        throw new Error('Cognito verifier not configured');
      }

      const payload = await this.verifier.verify(token);
      return payload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
