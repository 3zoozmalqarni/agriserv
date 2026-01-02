import { useState } from 'react';
import UserTypeSelection from './UserTypeSelection';
import LoginForm from './LoginForm';

export default function AuthContainer() {
  const [selectedUserType, setSelectedUserType] = useState<'beneficiary' | 'lab' | 'vet' | null>(null);

  if (selectedUserType === 'beneficiary' || selectedUserType === 'lab' || selectedUserType === 'vet') {
    return <LoginForm userType={selectedUserType} onBack={() => setSelectedUserType(null)} />;
  }

  return <UserTypeSelection onSelectType={setSelectedUserType} />;
}
