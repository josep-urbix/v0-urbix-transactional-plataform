export const taskEmailTemplates = {
  criticalTaskCreated: (task: any) => ({
    subject: `[CRÍTICO] Nueva tarea: ${task.titulo}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
            .priority-badge { display: inline-block; background: #dc2626; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #dc2626; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">⚠️ Nueva Tarea Crítica</h1>
            </div>
            <div class="content">
              <p><strong>Se ha creado una nueva tarea con prioridad CRÍTICA que requiere atención inmediata.</strong></p>
              
              <div class="info-row">
                <strong>Título:</strong> ${task.titulo}<br>
                <strong>Prioridad:</strong> <span class="priority-badge">CRÍTICA</span><br>
                <strong>Tipo:</strong> ${task.tipo}<br>
                <strong>Fecha límite:</strong> ${new Date(task.fecha_vencimiento).toLocaleString("es-ES")}
              </div>

              <div class="info-row">
                <strong>Descripción:</strong><br>
                ${task.descripcion || "Sin descripción"}
              </div>

              ${
                task.cuenta_virtual_id
                  ? `
                <div class="info-row" style="border-left-color: #f59e0b;">
                  <strong>⚠️ Esta tarea ha bloqueado una cuenta virtual</strong><br>
                  La cuenta permanecerá bloqueada hasta que se resuelva la tarea.
                </div>
              `
                  : ""
              }

              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${task.id}" class="button">
                Ver Tarea Completa
              </a>

              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                <strong>Recuerda:</strong> Las tareas críticas deben atenderse dentro de las próximas 4 horas según el SLA establecido.
              </p>
            </div>
            <div class="footer">
              URBIX Integrations - Sistema de Gestión de Tareas<br>
              Este es un email automático, por favor no respondas.
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
TAREA CRÍTICA

Se ha creado una nueva tarea con prioridad CRÍTICA:

Título: ${task.titulo}
Tipo: ${task.tipo}
Descripción: ${task.descripcion || "Sin descripción"}
Fecha límite: ${new Date(task.fecha_vencimiento).toLocaleString("es-ES")}

${task.cuenta_virtual_id ? "ATENCIÓN: Esta tarea ha bloqueado una cuenta virtual." : ""}

Ver tarea: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${task.id}
    `,
  }),

  taskDueSoon: (task: any) => ({
    subject: `Recordatorio: Tarea próxima a vencer - ${task.titulo}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
            .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #f59e0b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">⏰ Tarea Próxima a Vencer</h1>
            </div>
            <div class="content">
              <p>Te recordamos que tienes una tarea asignada que vence en las próximas 24 horas:</p>
              
              <div class="info-row">
                <strong>Título:</strong> ${task.titulo}<br>
                <strong>Prioridad:</strong> ${task.prioridad}<br>
                <strong>Tipo:</strong> ${task.tipo}<br>
                <strong>Vence:</strong> ${new Date(task.fecha_vencimiento).toLocaleString("es-ES")}
              </div>

              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${task.id}" class="button">
                Ver y Resolver Tarea
              </a>
            </div>
            <div class="footer">
              URBIX Integrations - Sistema de Gestión de Tareas
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
RECORDATORIO: TAREA PRÓXIMA A VENCER

Título: ${task.titulo}
Prioridad: ${task.prioridad}
Vence: ${new Date(task.fecha_vencimiento).toLocaleString("es-ES")}

Ver tarea: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${task.id}
    `,
  }),

  taskOverdue: (task: any) => ({
    subject: `[VENCIDA] Tarea fuera de plazo: ${task.titulo}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #991b1b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
            .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #991b1b; }
            .alert { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🚨 Tarea Vencida</h1>
            </div>
            <div class="content">
              <div class="alert">
                <strong>⚠️ ATENCIÓN:</strong> Esta tarea ha excedido su plazo de resolución y requiere acción inmediata.
              </div>
              
              <div class="info-row">
                <strong>Título:</strong> ${task.titulo}<br>
                <strong>Prioridad:</strong> ${task.prioridad}<br>
                <strong>Asignado a:</strong> ${task.asignado_a || "Sin asignar"}<br>
                <strong>Venció:</strong> ${new Date(task.fecha_vencimiento).toLocaleString("es-ES")}
              </div>

              ${
                task.escalada
                  ? `
                <div class="info-row" style="border-left-color: #dc2626;">
                  <strong>📢 Esta tarea ha sido escalada a supervisores</strong>
                </div>
              `
                  : ""
              }

              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${task.id}" class="button">
                Resolver Ahora
              </a>
            </div>
            <div class="footer">
              URBIX Integrations - Sistema de Gestión de Tareas
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
TAREA VENCIDA

ATENCIÓN: Esta tarea ha excedido su plazo de resolución.

Título: ${task.titulo}
Prioridad: ${task.prioridad}
Venció: ${new Date(task.fecha_vencimiento).toLocaleString("es-ES")}

Ver tarea: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${task.id}
    `,
  }),

  accountBlocked: (task: any, accountInfo: any) => ({
    subject: `[BLOQUEADA] Cuenta virtual bloqueada por tarea ${task.tipo}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
            .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #dc2626; }
            .alert { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔒 Cuenta Virtual Bloqueada</h1>
            </div>
            <div class="content">
              <div class="alert">
                <strong>⚠️ ACCIÓN REQUERIDA:</strong> Una cuenta virtual ha sido bloqueada automáticamente.
              </div>
              
              <div class="info-row">
                <strong>Cuenta:</strong> ${accountInfo.nombre}<br>
                <strong>Email:</strong> ${accountInfo.email || "N/A"}<br>
                <strong>Account ID:</strong> ${accountInfo.lemonway_account_id || "N/A"}
              </div>

              <div class="info-row">
                <strong>Motivo del Bloqueo:</strong><br>
                ${task.tipo} - ${task.titulo}
              </div>

              <p><strong>Tarea Asociada:</strong></p>
              <div class="info-row">
                ID: ${task.id}<br>
                Descripción: ${task.descripcion || "Sin descripción"}
              </div>

              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${task.id}" class="button">
                Ver y Resolver Tarea
              </a>

              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                La cuenta permanecerá bloqueada hasta que la tarea sea resuelta y aprobada por el equipo de Operaciones.
              </p>
            </div>
            <div class="footer">
              URBIX Integrations - Sistema de Gestión de Tareas<br>
              Notificación enviada a todos los administradores
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
CUENTA VIRTUAL BLOQUEADA

Una cuenta virtual ha sido bloqueada automáticamente.

Cuenta: ${accountInfo.nombre}
Email: ${accountInfo.email || "N/A"}
Account ID: ${accountInfo.lemonway_account_id || "N/A"}

Motivo: ${task.tipo} - ${task.titulo}

Ver tarea: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${task.id}

La cuenta permanecerá bloqueada hasta que la tarea sea resuelta.
    `,
  }),
}
