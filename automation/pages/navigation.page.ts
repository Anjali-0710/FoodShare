import { BasePage } from './base.page';

export class NavigationPage extends BasePage {
  private get sideMenuBtn() { return 'id=btn-side-menu'; }
  private get homeTab() { return 'id=tab-home'; }
  private get donationsTab() { return 'id=tab-donations'; }
  private get profileTab() { return 'id=tab-profile'; }
  private get notificationsTab() { return 'id=tab-notifications'; }
  private get adminTab() { return 'id=tab-admin'; }
  private get backBtn() { return 'id=btn-back'; }

  async openSideMenu(): Promise<void> {
    await this.click(this.sideMenuBtn);
  }

  async goToHome(): Promise<void> {
    await this.click(this.homeTab);
  }

  async goToDonations(): Promise<void> {
    await this.click(this.donationsTab);
  }

  async goToProfile(): Promise<void> {
    await this.click(this.profileTab);
  }

  async goToNotifications(): Promise<void> {
    await this.click(this.notificationsTab);
  }

  async goBack(): Promise<void> {
    await this.click(this.backBtn);
  }
}
