import { redirect } from 'next/navigation';

export default function BrowseRequestsRedirectPage() {
  redirect('/exchange?tab=community&view=all');
}
