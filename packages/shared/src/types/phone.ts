export interface PhoneProfileView {
  phoneNumber: string;
}

export interface PhoneContactView {
  id: string;
  phoneNumber: string;
  displayName: string;
}

export interface PhoneMessageView {
  id: string;
  direction: 'in' | 'out';
  otherPhoneNumber: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface PhoneContactSaveRequest {
  phoneNumber: string;
  displayName: string;
}

export interface PhoneSendMessageRequest {
  phoneNumber: string;
  body: string;
}
