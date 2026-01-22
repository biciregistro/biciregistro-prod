"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ongProfileSchema } from "@/lib/schemas";
import { updateOngProfile } from "@/lib/actions/ong-actions";
import type { OngUser } from "@/lib/types";
import { useState, useMemo } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/shared/image-upload";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countries } from "@/lib/countries";

type OngProfileFormValues = z.infer<typeof ongProfileSchema>;

interface OngProfileFormProps {
  ongProfile: OngUser;
}

export function OngProfileForm({ ongProfile }: OngProfileFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OngProfileFormValues>({
    resolver: zodResolver(ongProfileSchema),
    defaultValues: {
      organizationName: ongProfile.organizationName || "",
      contactPerson: ongProfile.contactPerson || "",
      organizationWhatsapp: ongProfile.organizationWhatsapp || "",
      contactWhatsapp: ongProfile.contactWhatsapp || "",
      websiteUrl: ongProfile.websiteUrl || "",
      instagramUrl: ongProfile.instagramUrl || "",
      facebookUrl: ongProfile.facebookUrl || "",
      country: ongProfile.country || "",
      state: ongProfile.state || "",
      logoUrl: ongProfile.logoUrl || "",
      coverUrl: ongProfile.coverUrl || "",
      description: ongProfile.description || "",
    },
  });

  const selectedCountry = form.watch("country");

  const availableStates = useMemo(() => {
    return countries.find((c) => c.name === selectedCountry)?.states || [];
  }, [selectedCountry]);

  async function onSubmit(data: OngProfileFormValues) {
    setIsSubmitting(true);
    try {
      const result = await updateOngProfile(data);
      if (result.success) {
        toast({
          title: "¡Éxito!",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil de la Organización</CardTitle>
        <CardDescription>
          Mantén actualizada la información de tu organización para que la comunidad pueda conocerte mejor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Organización</FormLabel>
                      <FormControl>
                        <Input placeholder="Bici-Aventuras A.C." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Logo and Cover Upload Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="logoUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Logo (Perfil)</FormLabel>
                                <FormControl>
                                    <div className="space-y-4">
                                        {field.value && (
                                            <div className="relative w-full aspect-square max-w-[120px] border rounded-md overflow-hidden group">
                                                <Image 
                                                    src={field.value} 
                                                    alt="Logo actual" 
                                                    fill 
                                                    className="object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => field.onChange("")}
                                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="h-6 w-6 text-white" />
                                                </button>
                                            </div>
                                        )}
                                        <ImageUpload
                                            storagePath={`ongs/${ongProfile.id}/logos`}
                                            onUploadSuccess={(url) => field.onChange(url)}
                                            buttonText={field.value ? "Cambiar Logo" : "Subir Logo"}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="coverUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Foto de Portada</FormLabel>
                                <FormControl>
                                    <div className="space-y-4">
                                        {field.value && (
                                            <div className="relative w-full aspect-video border rounded-md overflow-hidden group">
                                                <Image 
                                                    src={field.value} 
                                                    alt="Portada actual" 
                                                    fill 
                                                    className="object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => field.onChange("")}
                                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="h-6 w-6 text-white" />
                                                </button>
                                            </div>
                                        )}
                                        <ImageUpload
                                            storagePath={`ongs/${ongProfile.id}/covers`}
                                            onUploadSuccess={(url) => field.onChange(url)}
                                            buttonText={field.value ? "Cambiar Portada" : "Subir Portada"}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Somos una organización dedicada a promover el ciclismo..."
                          className="resize-none h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Una breve descripción de tu organización (máx. 500 caracteres).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persona de Contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Right Column */}
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="organizationWhatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp de la Organización</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+52 55 1234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactWhatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp del Contacto</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+52 55 8765 4321" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Página Web</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://www.bici-aventuras.org" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="instagramUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://www.instagram.com/biciaventuras" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="facebookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://www.facebook.com/biciaventuras" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>País</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue("state", ""); // Reset state when country changes
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un país" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country.code} value={country.name}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={!selectedCountry}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={selectedCountry ? "Selecciona un estado" : "Selecciona país primero"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableStates.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                    </>
                ) : (
                    "Guardar Cambios"
                )}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
