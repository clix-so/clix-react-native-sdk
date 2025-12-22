"use strict";

export class TokenService {
  currentTokenKey = 'clix_current_push_token';
  constructor(storageService) {
    this.storageService = storageService;
  }
  getCurrentToken() {
    return this.storageService.get(this.currentTokenKey);
  }
  saveToken(token) {
    this.storageService.set(this.currentTokenKey, token);
  }
}
//# sourceMappingURL=TokenService.js.map