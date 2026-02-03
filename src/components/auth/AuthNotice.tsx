import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

type AuthNoticeProps = {
  error?: string | null;
  success?: string | null;
};

export default function AuthNotice({ error, success }: AuthNoticeProps) {
  if (!error && !success) return null;

  return (
    <Alert variant={error ? 'destructive' : 'default'}>
      <AlertTitle>{error ? 'Something went wrong' : 'Success'}</AlertTitle>
      <AlertDescription>{error ?? success}</AlertDescription>
    </Alert>
  );
}
