import { BasePage } from './base.page';

export class ProfilePage extends BasePage {
  private get editProfileBtn() { return 'id=btn-edit-profile'; }
  private get nameInput() { return 'id=input-profile-name'; }
  private get phoneInput() { return 'id=input-profile-phone'; }
  private get orgInput() { return 'id=input-profile-org'; }
  private get bioInput() { return 'id=input-profile-bio'; }
  private get saveBtn() { return 'id=btn-save-profile'; }
  private get cancelBtn() { return 'id=btn-cancel-profile'; }
  private get successSnackbar() { return 'id=snackbar-success'; }
  private get errorSnackbar() { return 'id=snackbar-error'; }
  private get profilePicBtn() { return 'id=btn-upload-profile-pic'; }

  async tapEditProfile(): Promise<void> {
    await this.click(this.editProfileBtn);
  }

  async fillName(name: string): Promise<void> {
    await this.type(this.nameInput, name);
  }

  async fillPhone(phone: string): Promise<void> {
    await this.type(this.phoneInput, phone);
  }

  async fillOrganization(org: string): Promise<void> {
    await this.type(this.orgInput, org);
  }

  async fillBio(bio: string): Promise<void> {
    await this.type(this.bioInput, bio);
  }

  async saveProfile(): Promise<void> {
    await this.click(this.saveBtn);
  }

  async cancelEditing(): Promise<void> {
    await this.click(this.cancelBtn);
  }

  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.successSnackbar);
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorSnackbar);
  }
}
