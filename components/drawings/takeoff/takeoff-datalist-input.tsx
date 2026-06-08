import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";

type TakeoffDatalistInputProps = Omit<ComponentProps<typeof Input>, "list"> & {
  listId: string;
  options: string[];
};

export function TakeoffDatalistInput({
  listId,
  options,
  ...props
}: TakeoffDatalistInputProps) {
  return (
    <>
      <Input list={listId} {...props} />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
