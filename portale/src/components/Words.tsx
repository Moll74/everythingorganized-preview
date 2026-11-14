import { Fragment } from "react";

type Props = { text: string; className?: string };

// One inline-block span per word for the reveal; the spaces stay as text.
export function Words({ text, className }: Props) {
  const words = text.split(" ");
  return words.map((word, i) => (
    <Fragment key={i}>
      <span className={className} data-word="">
        {word}
      </span>
      {i < words.length - 1 ? " " : null}
    </Fragment>
  ));
}
