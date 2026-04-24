import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { extractError } from "@/api/client";
import { getMe, login } from "@/api/endpoints";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/store/auth";

const schema = z.object({
  phone: z.string().trim().min(3, "Введите номер телефона"),
  password: z.string().min(1, "Введите пароль"),
});

type LoginFormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setToken = useAuth((s) => s.setToken);
  const setProfile = useAuth((s) => s.setProfile);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const { access_token } = await login(data.phone, data.password);
      setToken(access_token);
      const profile = await getMe();
      setProfile(profile);
      return profile;
    },
    onSuccess: () => {
      navigate("/orders", { replace: true });
    },
    onError: (err) => {
      setToken(null);
      toast.error(extractError(err, "Не удалось войти"));
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="size-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-2xl font-bold mb-3">
            T
          </div>
          <h1 className="text-xl font-semibold text-slate-900">TenMin Admin</h1>
          <p className="text-sm text-slate-500 mt-1">
            Вход по номеру телефона и паролю
          </p>
        </div>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="card p-6 space-y-4"
        >
          <div>
            <label className="label">Номер телефона</label>
            <input
              type="tel"
              autoComplete="username"
              placeholder="+7 700 000 00 00"
              className="input"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="label">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="input pr-10"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary w-full"
          >
            {mutation.isPending ? <LoadingSpinner className="size-4" /> : <LogIn size={18} />}
            Войти
          </button>

          <p className="text-xs text-slate-400 text-center pt-2">
            Не знаете свои данные? Обратитесь к администратору.
          </p>
        </form>
      </div>
    </div>
  );
}
