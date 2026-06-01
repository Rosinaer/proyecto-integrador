import prisma from '../config/prisma.js';

// CATEGORIAS DE SERVICIOS

export const obtenerCategorias = async (req, res) => {
  try {
    const categorias = await prisma.serviceCategory.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        services: {
          where: { active: true },
          orderBy: { name: "asc" },
        },
      },
    });

    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearCategoria = async (req, res) => {
  try {
    const { name, displayOrder } = req.body;

    if (!name || displayOrder === undefined) {
      return res.status(400).json({
        mensaje: "name y displayOrder son obligatorios",
      });
    }

    const categoria = await prisma.serviceCategory.create({
      data: {
        name,
        displayOrder: Number(displayOrder),
      },
    });

    res.status(201).json(categoria);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ mensaje: "Ya existe una categoría con ese nombre" });
    }
    res.status(500).json({ error: error.message });
  }
};

export const actualizarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, displayOrder } = req.body;

    const categoria = await prisma.serviceCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(displayOrder !== undefined && {
          displayOrder: Number(displayOrder),
        }),
      },
    });

    res.json(categoria);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ mensaje: "Categoría no encontrada" });
    }
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ mensaje: "Ya existe una categoría con ese nombre" });
    }
    res.status(500).json({ error: error.message });
  }
};

// SERVICIOS

export const obtenerServicios = async (req, res) => {
  try {
    const { active } = req.query;

    const servicios = await prisma.service.findMany({
      where: active !== undefined ? { active: active === "true" } : undefined,
      include: { category: true },
      orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }],
    });

    res.json(servicios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerServicioPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const servicio = await prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        professionalServices: {
          include: {
            professional: { include: { person: true } },
          },
        },
      },
    });

    if (!servicio) {
      return res.status(404).json({ mensaje: "Servicio no encontrado" });
    }

    res.json(servicio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearServicio = async (req, res) => {
  try {
    const { name, categoryId, defaultDurationMinutes, requiresPreConsult, reminderNote } = req.body;

    if (!name || !categoryId || !defaultDurationMinutes) {
      return res.status(400).json({
        mensaje: "name, categoryId y defaultDurationMinutes son obligatorios",
      });
    }

    if (Number(defaultDurationMinutes) <= 0) {
      return res.status(400).json({
        mensaje: "defaultDurationMinutes debe ser mayor a 0",
      });
    }

    const servicio = await prisma.service.create({
      data: {
        name,
        categoryId,
        defaultDurationMinutes: Number(defaultDurationMinutes),
        requiresPreConsult: requiresPreConsult === true || requiresPreConsult === 'true',
        reminderNote: reminderNote || null,
      },
      include: { category: true },
    });

    res.status(201).json(servicio);
  } catch (error) {
    if (error.code === "P2003") {
      return res
        .status(400)
        .json({ mensaje: "La categoría indicada no existe" });
    }
    res.status(500).json({ error: error.message });
  }
};

export const actualizarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId, defaultDurationMinutes, active, requiresPreConsult, reminderNote } = req.body;

    if (
      defaultDurationMinutes !== undefined &&
      Number(defaultDurationMinutes) <= 0
    ) {
      return res.status(400).json({
        mensaje: "defaultDurationMinutes debe ser mayor a 0",
      });
    }

    const servicio = await prisma.service.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(categoryId !== undefined && { categoryId }),
        ...(defaultDurationMinutes !== undefined && {
          defaultDurationMinutes: Number(defaultDurationMinutes),
        }),
        ...(active !== undefined && { active }),
        ...(requiresPreConsult !== undefined && { 
          requiresPreConsult: requiresPreConsult === true || requiresPreConsult === 'true' 
        }),
        ...(reminderNote !== undefined && { reminderNote }),
      },
      include: { category: true },
    });

    res.json(servicio);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ mensaje: "Servicio no encontrado" });
    }
    if (error.code === "P2003") {
      return res
        .status(400)
        .json({ mensaje: "La categoría indicada no existe" });
    }
    res.status(500).json({ error: error.message });
  }
};

export const desactivarServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const servicio = await prisma.service.update({
      where: { id },
      data: { active: false },
      include: { category: true },
    });

    res.json(servicio);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ mensaje: "Servicio no encontrado" });
    }
    res.status(500).json({ error: error.message });
  }
};

export const crearProfessionalService = async (req, res) => {
  try {
    const { professionalId, serviceId, price, durationMinutes } = req.body;

    if (
      !professionalId ||
      !serviceId ||
      price === undefined ||
      !durationMinutes
    ) {
      return res.status(400).json({
        mensaje:
          "professionalId, serviceId, price y durationMinutes son obligatorios",
      });
    }

    if (Number(price) < 0) {
      return res
        .status(400)
        .json({ mensaje: "El precio no puede ser negativo" });
    }

    if (Number(durationMinutes) <= 0) {
      return res
        .status(400)
        .json({ mensaje: "durationMinutes debe ser mayor a 0" });
    }

    const existente = await prisma.professionalService.findFirst({
      where: { professionalId, serviceId },
    });

    if (existente) {
      return res.status(409).json({
        mensaje:
          "Ya existe esta combinación profesional-servicio. Usá PATCH para actualizar precio o duración.",
        id: existente.id,
      });
    }

    const ps = await prisma.professionalService.create({
      data: {
        professionalId,
        serviceId,
        price: Number(price),
        durationMinutes: Number(durationMinutes),
      },
      include: {
        professional: { include: { person: true } },
        service: { include: { category: true } },
      },
    });

    res.status(201).json(ps);
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(400).json({
        mensaje: "El profesional o servicio indicado no existe",
      });
    }
    res.status(500).json({ error: error.message });
  }
};

export const actualizarProfessionalService = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, durationMinutes } = req.body;

    if (price === undefined && durationMinutes === undefined) {
      return res.status(400).json({
        mensaje:
          "Debés enviar al menos price o durationMinutes para actualizar",
      });
    }

    if (price !== undefined && Number(price) < 0) {
      return res
        .status(400)
        .json({ mensaje: "El precio no puede ser negativo" });
    }

    if (durationMinutes !== undefined && Number(durationMinutes) <= 0) {
      return res
        .status(400)
        .json({ mensaje: "durationMinutes debe ser mayor a 0" });
    }

    const ps = await prisma.professionalService.update({
      where: { id },
      data: {
        ...(price !== undefined && { price: Number(price) }),
        ...(durationMinutes !== undefined && {
          durationMinutes: Number(durationMinutes),
        }),
      },
      include: {
        professional: { include: { person: true } },
        service: { include: { category: true } },
      },
    });

    res.json(ps);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ mensaje: "Configuración profesional-servicio no encontrada" });
    }
    res.status(500).json({ error: error.message });
  }
};
