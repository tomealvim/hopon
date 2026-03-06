import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || 'not_configured';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || 'not_configured';
    const callbackURL = configService.get<string>(
      'GOOGLE_CALLBACK_URL',
      'http://localhost:3000/api/v1/auth/google/callback',
    );
    super({ clientID, clientSecret, callbackURL, scope: ['email', 'profile'] });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    return this.authService.findOrCreateGoogleUser(profile);
  }
}
