
import { redirect } from 'next/navigation';

export default function HomePage() {
  // For now, redirect to login. Once auth is implemented, this might redirect
  // to dashboard if logged in, or login if not.
  redirect('/login'); 
  // return null; 
}
