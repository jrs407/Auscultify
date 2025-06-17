-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `mydb` DEFAULT CHARACTER SET utf8 ;
USE `mydb` ;

-- -----------------------------------------------------
-- Table `mydb`.`CriterioAlgoritmo`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`CriterioAlgoritmo` (
  `idCriterioAlgoritmo` INT NOT NULL,
  `textoCriterio` VARCHAR(255) NULL DEFAULT NULL,
  `tituloCriterio` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`idCriterioAlgoritmo`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Usuarios`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Usuarios` (
  `idUsuario` INT NOT NULL,
  `correoElectronico` VARCHAR(255) NULL DEFAULT NULL,
  `contrasena` VARCHAR(255) NULL DEFAULT NULL,
  `totalPreguntasAcertadas` INT NULL DEFAULT NULL,
  `totalPreguntasFalladas` INT NULL DEFAULT NULL,
  `totalPreguntasContestadas` INT NULL DEFAULT NULL,
  `racha` INT NULL DEFAULT NULL,
  `ultimoDiaPregunta` DATE NULL DEFAULT NULL,
  `esPublico` TINYINT NULL DEFAULT NULL,
  `idCriterioMasUsado` INT NOT NULL,
  PRIMARY KEY (`idUsuario`),
  INDEX `fk_Usuarios_CriterioAlgoritmo1_idx` (`idCriterioMasUsado` ASC) VISIBLE,
  CONSTRAINT `fk_Usuarios_CriterioAlgoritmo1`
    FOREIGN KEY (`idCriterioMasUsado`)
    REFERENCES `mydb`.`CriterioAlgoritmo` (`idCriterioAlgoritmo`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Usuarios_Seguidores`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Usuarios_Seguidores` (
  `idSeguidor` INT NOT NULL,
  `idSeguido` INT NOT NULL,
  PRIMARY KEY (`idSeguidor`, `idSeguido`),
  INDEX `fk_Seguido_idx` (`idSeguido` ASC) VISIBLE,
  CONSTRAINT `fk_Seguidor`
    FOREIGN KEY (`idSeguidor`)
    REFERENCES `mydb`.`Usuarios` (`idUsuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Seguido`
    FOREIGN KEY (`idSeguido`)
    REFERENCES `mydb`.`Usuarios` (`idUsuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Categorias`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Categorias` (
  `idCategorias` INT NOT NULL,
  `nombreCategoria` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`idCategorias`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Preguntas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Preguntas` (
  `idPregunta` INT NOT NULL,
  `urlAudio` VARCHAR(255) NULL DEFAULT NULL,
  `respuestaCorrecta` VARCHAR(255) NULL DEFAULT NULL,
  `Categorias_idCategorias` INT NOT NULL,
  PRIMARY KEY (`idPregunta`),
  INDEX `fk_Preguntas_Categorias_idx` (`Categorias_idCategorias` ASC) VISIBLE,
  CONSTRAINT `fk_Preguntas_Categorias`
    FOREIGN KEY (`Categorias_idCategorias`)
    REFERENCES `mydb`.`Categorias` (`idCategorias`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Usuarios_has_Preguntas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Usuarios_has_Preguntas` (
  `Usuarios_idUsuario` INT NOT NULL,
  `Preguntas_idPregunta` INT NOT NULL,
  `idRespuesta` INT NOT NULL,
  `fechaDeContestacion` DATE NULL DEFAULT NULL,
  `respuestaCorrecta` TINYINT NULL DEFAULT NULL,
  PRIMARY KEY (`Usuarios_idUsuario`, `Preguntas_idPregunta`, `idRespuesta`),
  INDEX `fk_Usuarios_has_Preguntas_Preguntas1_idx` (`Preguntas_idPregunta` ASC) VISIBLE,
  INDEX `fk_Usuarios_has_Preguntas_Usuarios1_idx` (`Usuarios_idUsuario` ASC) VISIBLE,
  CONSTRAINT `fk_Usuarios_has_Preguntas_Usuarios1`
    FOREIGN KEY (`Usuarios_idUsuario`)
    REFERENCES `mydb`.`Usuarios` (`idUsuario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Usuarios_has_Preguntas_Preguntas1`
    FOREIGN KEY (`Preguntas_idPregunta`)
    REFERENCES `mydb`.`Preguntas` (`idPregunta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
