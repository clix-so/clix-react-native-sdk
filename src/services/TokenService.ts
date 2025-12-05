import { StorageService } from './StorageService';

export class TokenService {
  private currentTokenKey = 'clix_current_push_token';

  constructor(private readonly storageService: StorageService) {}

  getCurrentToken(): string | undefined {
    return this.storageService.get<string>(this.currentTokenKey);
  }
}
