import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "../ui/button";

interface DialogInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
}

export const DialogInput: React.FC<DialogInputProps> = ({ value = '', onChange, onSubmit }) => {

    const handleSubmit = () => {
        onSubmit();
        onChange('');
    }

    return (
        <Field className="dialogInput rounded-[30px]">
            {/* <FieldLabel htmlFor="checkout-7j9-card-name-43j">
                текст сообщения
            </FieldLabel> */}
            <Input
                id="checkout-7j9-card-name-43j"
                className="h-[60px] rounded-[30px]"
                placeholder="текст сообщения"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required
            />
            <Button onClick={handleSubmit}>XYU</Button>
        </Field>
    )
}