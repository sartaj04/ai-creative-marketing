"use client";

import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useState } from "react";
import { CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// Demo events
const demoEvents = [
    {
        id: 1,
        title: "Instagram Post - Sale",
        start: new Date(2024, 0, 15, 10, 0),
        end: new Date(2024, 0, 15, 10, 30),
        platform: "instagram",
    },
    {
        id: 2,
        title: "LinkedIn Article",
        start: new Date(2024, 0, 17, 14, 0),
        end: new Date(2024, 0, 17, 14, 30),
        platform: "linkedin",
    },
    {
        id: 3,
        title: "Twitter Thread",
        start: new Date(2024, 0, 20, 9, 0),
        end: new Date(2024, 0, 20, 9, 30),
        platform: "twitter",
    },
];

export default function CalendarPage() {
    const [events, setEvents] = useState(demoEvents);
    const [date, setDate] = useState(new Date());

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Content Calendar</h1>
                    <p className="text-muted-foreground">
                        Schedule and manage your posts
                    </p>
                </div>
                <Button>
                    <Plus className="h-4 w-4 mr-2" /> Add Post
                </Button>
            </div>

            {/* Calendar */}
            <Card>
                <CardContent className="p-4">
                    <div className="h-[600px]">
                        <BigCalendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            date={date}
                            onNavigate={setDate}
                            views={["month", "week", "day"]}
                            style={{ height: "100%" }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
