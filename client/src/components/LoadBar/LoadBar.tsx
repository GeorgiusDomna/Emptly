import { LoaderIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className={cn("size-6 animate-spin", className)}
      {...props}
    />
  )
}

export function LoadBar() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Spinner />
      <span className="text-sm text-gray-600">Loading...</span>
    </div>
  )
}
