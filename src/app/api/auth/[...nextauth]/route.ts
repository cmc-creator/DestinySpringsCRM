import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRequestIdentity } from "@/lib/rate-limit";

export const maxDuration = 30;

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
	const identity = getRequestIdentity(req);
	const ipLimit = checkRateLimit({
		namespace: "auth-login-ip",
		key: identity,
		limit: 15,
		windowMs: 10 * 60 * 1000,
	});

	if (!ipLimit.allowed) {
		return NextResponse.json(
			{ error: "RateLimit", message: "Too many sign-in attempts. Please try again shortly." },
			{
				status: 429,
				headers: {
					"Retry-After": String(ipLimit.retryAfterSeconds),
				},
			}
		);
	}

	try {
		const form = await req.clone().formData();
		const rawEmail = form.get("email");
		const email = typeof rawEmail === "string" ? rawEmail.toLowerCase().trim() : "";

		if (email) {
			const emailLimit = checkRateLimit({
				namespace: "auth-login-email",
				key: `${email}|${identity}`,
				limit: 8,
				windowMs: 10 * 60 * 1000,
			});

			if (!emailLimit.allowed) {
				return NextResponse.json(
					{ error: "RateLimit", message: "Too many sign-in attempts for this account." },
					{
						status: 429,
						headers: {
							"Retry-After": String(emailLimit.retryAfterSeconds),
						},
					}
				);
			}
		}
	} catch {
		// Keep sign-in path resilient if payload parsing changes.
	}

	return handlers.POST(req);
}
