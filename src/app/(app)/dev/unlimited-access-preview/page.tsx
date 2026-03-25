import { redirect } from 'next/navigation';

export default function UnlimitedAccessPreviewRedirectPage() {
  redirect('/dev/components-preview');
}
