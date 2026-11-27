export default function ErrorBox({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {errors.length === 1 ? (
        <p>{errors[0]}</p>
      ) : (
        <>
          <p className="font-medium">Corrija os seguintes campos:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}
