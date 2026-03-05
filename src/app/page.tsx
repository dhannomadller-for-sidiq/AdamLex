import { redirect } from 'next/navigation';

export default function HomePage() {
  // Directly redirect cleanly to the login page as this is a private CRM
  redirect('/login');
}
