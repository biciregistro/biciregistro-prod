'use client';

import { UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CustomQuestionsSectionProps {
    form: UseFormReturn<any>;
}

export function CustomQuestionsSection({ form }: CustomQuestionsSectionProps) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "customQuestions",
    });

    const hasCustomQuestions = useWatch({ control: form.control, name: "hasCustomQuestions" });

    const addQuestion = () => {
        append({
            id: crypto.randomUUID(),
            label: "",
            type: "text",
            required: false,
            options: []
        });
    };

    const addOption = (questionIndex: number) => {
        const currentOptions = form.getValues(`customQuestions.${questionIndex}.options`) || [];
        form.setValue(`customQuestions.${questionIndex}.options`, [...currentOptions, ""]);
    };

    const removeOption = (questionIndex: number, optionIndex: number) => {
        const currentOptions = form.getValues(`customQuestions.${questionIndex}.options`) || [];
        const newOptions = currentOptions.filter((_: any, idx: number) => idx !== optionIndex);
        form.setValue(`customQuestions.${questionIndex}.options`, newOptions);
    };

    return (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/5 mt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-indigo-600" />
                        Preguntas Personalizadas
                    </h3>
                    <p className="text-sm text-muted-foreground">¿Necesitas hacer preguntas adicionales a los participantes?</p>
                </div>
                <div className="flex items-center space-x-2">
                    <FormLabel className="font-normal cursor-pointer" htmlFor="custom-questions-toggle">
                        {hasCustomQuestions ? "Sí" : "No"}
                    </FormLabel>
                    <Switch
                        id="custom-questions-toggle"
                        checked={hasCustomQuestions}
                        onCheckedChange={(checked) => {
                            form.setValue('hasCustomQuestions', checked);
                            if (!checked) {
                                form.setValue('customQuestions', []);
                            }
                        }}
                    />
                </div>
            </div>

            {hasCustomQuestions && (
                <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                    {fields.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
                            <p className="text-muted-foreground mb-4">No has agregado ninguna pregunta personalizada.</p>
                            <Button type="button" variant="outline" onClick={addQuestion}>
                                <Plus className="mr-2 h-4 w-4" /> Agregar Pregunta
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {fields.map((field, index) => {
                                const questionType = form.watch(`customQuestions.${index}.type`);
                                
                                return (
                                    <Card key={field.id} className="border-l-4 border-l-indigo-500 relative">
                                        <CardContent className="pt-6 grid gap-4">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="grid gap-4 flex-1">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <FormField
                                                            control={form.control}
                                                            name={`customQuestions.${index}.label`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Pregunta</FormLabel>
                                                                    <FormControl>
                                                                        <Input placeholder="Ej. ¿Perteneces a algún equipo?" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <FormField
                                                            control={form.control}
                                                            name={`customQuestions.${index}.type`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Tipo de Respuesta</FormLabel>
                                                                    <Select 
                                                                        onValueChange={field.onChange} 
                                                                        defaultValue={field.value}
                                                                    >
                                                                        <FormControl>
                                                                            <SelectTrigger>
                                                                                <SelectValue placeholder="Selecciona el tipo" />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent>
                                                                            <SelectItem value="text">Texto Corto</SelectItem>
                                                                            <SelectItem value="radio">Opción Única (Radio)</SelectItem>
                                                                            <SelectItem value="checkbox">Opción Múltiple (Checkbox)</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>

                                                    <FormField
                                                        control={form.control}
                                                        name={`customQuestions.${index}.required`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/20">
                                                                <div className="space-y-0.5">
                                                                    <FormLabel>Obligatoria</FormLabel>
                                                                    <FormDescription>
                                                                        El participante no podrá inscribirse sin responder esta pregunta.
                                                                    </FormDescription>
                                                                </div>
                                                                <FormControl>
                                                                    <Switch
                                                                        checked={field.value}
                                                                        onCheckedChange={field.onChange}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />

                                                    {/* Opciones para Radio/Checkbox */}
                                                    {(questionType === 'radio' || questionType === 'checkbox') && (
                                                        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                                                            <div className="flex justify-between items-center">
                                                                <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Opciones de Respuesta</FormLabel>
                                                                <Button type="button" variant="ghost" size="sm" onClick={() => addOption(index)} className="h-6 text-xs text-primary hover:text-primary/80">
                                                                    <Plus className="mr-1 h-3 w-3" /> Agregar Opción
                                                                </Button>
                                                            </div>
                                                            
                                                            {form.watch(`customQuestions.${index}.options`)?.map((_: any, optIndex: number) => (
                                                                <div key={optIndex} className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-200">
                                                                    <Badge variant="outline" className="h-6 w-6 flex items-center justify-center p-0 shrink-0">{optIndex + 1}</Badge>
                                                                    <FormField
                                                                        control={form.control}
                                                                        name={`customQuestions.${index}.options.${optIndex}`}
                                                                        render={({ field }) => (
                                                                            <FormItem className="flex-1 space-y-0">
                                                                                <FormControl>
                                                                                    <Input placeholder={`Opción ${optIndex + 1}`} {...field} className="h-8" />
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                    <Button 
                                                                        type="button" 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                        onClick={() => removeOption(index, optIndex)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                            
                                                            {(!form.watch(`customQuestions.${index}.options`) || form.watch(`customQuestions.${index}.options`)?.length === 0) && (
                                                                <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">
                                                                    Debes agregar al menos una opción.
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => remove(index)}
                                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                            
                            <Button type="button" variant="outline" onClick={addQuestion} className="w-full border-dashed border-2 py-6 text-muted-foreground hover:text-foreground">
                                <Plus className="mr-2 h-4 w-4" /> Agregar otra pregunta
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
