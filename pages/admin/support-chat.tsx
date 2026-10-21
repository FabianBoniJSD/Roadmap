import type { GetServerSideProps } from 'next';
import { ORBIT_URL } from '@/utils/orbit';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: ORBIT_URL, permanent: false },
});

export default function RetiredSupportChatPage() {
  return null;
}
