import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "~/components/auth/login-form";
import {
  ADMIN_AUTH_COOKIE,
  isValidAdminAuthCookie,
} from "~/lib/auth/simple-admin-auth";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resolveNextPath(nextParam: string | string[] | undefined): string {
  if (typeof nextParam === "string" && nextParam.startsWith("/")) {
    return nextParam;
  }
  return "/admin";
}

export default async function HomePage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;
  const params = await searchParams;
  const redirectTarget = resolveNextPath(params?.next);

  const isValid = await isValidAdminAuthCookie(authCookie);
  if (isValid) {
    redirect(redirectTarget);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-lg">
        <header>
          <h1 className="text-3xl font-semibold text-gray-900">后台登录</h1>
          <p className="mt-2 text-sm text-gray-600">
            请输入管理员用户名和密码，登录后可访问管理功能。
          </p>
        </header>

        <LoginForm redirectTo={redirectTarget} />
      </div>
    </div>
  );
}
