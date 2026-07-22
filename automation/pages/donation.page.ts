import { BasePage } from './base.page';

export class DonationPage extends BasePage {
  private get createDonationBtn() { return 'id=btn-create-donation'; }
  private get foodNameInput() { return 'id=input-food-name'; }
  private get quantityInput() { return 'id=input-quantity'; }
  private get expiryInput() { return 'id=input-expiry'; }
  private get addressInput() { return 'id=input-pickup-address'; }
  private get categoryDropdown() { return 'id=dropdown-food-category'; }
  private get submitDonationBtn() { return 'id=btn-submit-donation'; }
  private get searchInput() { return 'id=input-search-donations'; }
  private get filterBtn() { return 'id=btn-filter'; }
  private get statusFilterAvailable() { return 'id=filter-status-available'; }
  private get donationCard() { return '~donation-card'; }
  private get deleteBtn() { return 'id=btn-delete-donation'; }
  private get confirmDeleteBtn() { return 'id=btn-confirm-delete'; }
  private get editBtn() { return 'id=btn-edit-donation'; }

  async tapCreateDonation(): Promise<void> {
    await this.click(this.createDonationBtn);
  }

  async fillFoodName(name: string): Promise<void> {
    await this.type(this.foodNameInput, name);
  }

  async fillQuantity(qty: string): Promise<void> {
    await this.type(this.quantityInput, qty);
  }

  async fillAddress(addr: string): Promise<void> {
    await this.type(this.addressInput, addr);
  }

  async submitDonation(): Promise<void> {
    await this.click(this.submitDonationBtn);
  }

  async searchDonation(keyword: string): Promise<void> {
    await this.type(this.searchInput, keyword);
  }

  async applyAvailableFilter(): Promise<void> {
    await this.click(this.filterBtn);
    await this.click(this.statusFilterAvailable);
  }

  async deleteDonation(): Promise<void> {
    await this.click(this.deleteBtn);
    await this.click(this.confirmDeleteBtn);
  }

  async tapEdit(): Promise<void> {
    await this.click(this.editBtn);
  }
}
