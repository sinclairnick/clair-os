import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/page-title";
import { PageHeader, PageHeaderHeading } from "@/components/page-header";

export function CalendarPage() {
	return (
		<div className="space-y-6">
			<PageTitle title="Calendar" />
			<PageHeader>
				<PageHeaderHeading title="Calendar" description="Your family's unified schedule" />
			</PageHeader>

			<Card>
				<CardHeader>
					<CardTitle>Calendar coming soon</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						View all your scheduled meals, tasks, and events in one place.
						Each family member's items will be color-coded for easy viewing.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
