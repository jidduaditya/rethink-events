import Image from "next/image";
import type { Event } from "@/lib/types";

export function SpeakerBlock({ event }: { event: Event }) {
  if (!event.speaker_name) return null;
  return (
    <div className="border-4 border-on-background bg-surface-container p-stack-md">
      <p className="mb-stack-sm font-mono text-label-mono uppercase text-on-surface-variant">
        Speaker
      </p>
      <div className="flex items-start gap-stack-md">
        {event.speaker_photo_url && (
          <Image
            src={event.speaker_photo_url}
            alt={event.speaker_name}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full border-2 border-on-background object-cover grayscale"
            unoptimized
          />
        )}
        <div>
          <p className="font-serif text-headline-md font-bold">
            {event.speaker_name}
          </p>
          {event.speaker_bio && (
            <p className="mt-1 font-sans text-body-md text-on-surface-variant">
              {event.speaker_bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
