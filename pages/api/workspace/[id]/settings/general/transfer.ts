import type { NextApiRequest, NextApiResponse } from 'next'
import { withSessionRoute } from '@/lib/withSession'

export default withSessionRoute(handler);

// Owners can't hand a workspace over themselves any more. They ask support in live chat, and a Super Admin approves it
// on the Platform portal (utils/workspace/transfer.ts is the only code that does it).
export async function handler(_req: NextApiRequest, res: NextApiResponse) {
	return res.status(403).json({
		success: false,
		error: 'Workspace transfers are handled by our support team. Open live chat and ask for a transfer.',
	})
}
