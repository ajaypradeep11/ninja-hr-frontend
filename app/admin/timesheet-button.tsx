"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui";

interface Row {
  name: string;
  department: string;
  salary: number;
}

/** Generates a biweekly timesheet CSV from employee data and downloads it. */
export function TimesheetButton({ employees, period }: { employees: Row[]; period: string }) {
  const [done, setDone] = React.useState(false);

  function generate() {
    const header = "Employee,Department,Period,Hours,Gross Pay (CAD)";
    const lines = employees.map((e) => {
      const biweekly = (e.salary / 26).toFixed(2);
      return `"${e.name}","${e.department}","${period}",75,${biweekly}`;
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets-${period.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }

  return (
    <Button className="mt-4 w-full" onClick={generate}>
      {done ? (
        <>
          <Check className="h-4 w-4" /> Timesheets generated
        </>
      ) : (
        "Generate All Timesheets"
      )}
    </Button>
  );
}
