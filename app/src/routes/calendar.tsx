import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <p className="text-muted-foreground">
          Your family's unified schedule
        </p>
      </div>

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
