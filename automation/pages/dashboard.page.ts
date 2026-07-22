import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  private get statsTitle() { return 'id=header-stats-title'; }
  private get navMenuBtn() { return 'id=btn-nav-menu'; }
  private get profileAvatar() { return 'id=header-profile-avatar'; }
  private get logoutButton() { return 'id=btn-logout'; }

  async getDashboardTitle(): Promise<string> {
    return await this.getText(this.statsTitle);
  }

  async logout(): Promise<void> {
    await this.click(this.profileAvatar);
    await this.click(this.logoutButton);
  }
}
